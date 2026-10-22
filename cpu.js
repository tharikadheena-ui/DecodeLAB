/**
 * DecodeLab — Educational 8086 Instruction Simulator Core
 * Simplified for 2nd-year Computer Organization and Architecture (COA) projects.
 * 
 * Supports:
 * - Registers: AX, BX, IP
 * - Flags: ZF (Zero Flag), CF (Carry Flag)
 * - Instructions: MOV, ADD, HLT
 */

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.CPU8086 = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const MAX_STEPS = 100;

    /**
     * Parse immediate number string to integer.
     * Supports:
     * - Hexadecimal: 0005H, 0003H, 0FFFFH, 0x0005
     * - Decimal: 5, 3
     */
    function parseImmediate(token) {
        if (typeof token === 'number') return token;
        if (!token || typeof token !== 'string') return null;
        token = token.trim();

        if (/^0x[0-9a-fA-F]+$/i.test(token)) {
            return parseInt(token, 16);
        }
        if (/^[0-9a-fA-F]+[hH]$/i.test(token)) {
            return parseInt(token.slice(0, -1), 16);
        }
        if (/^-?\d+$/.test(token)) {
            return parseInt(token, 10);
        }
        return null;
    }

    /**
     * Format number as 4-digit hexadecimal (e.g. 0005H)
     */
    function formatHex(val, suffix = true) {
        const unsigned = (val & 0xFFFF) >>> 0;
        const hex = unsigned.toString(16).toUpperCase().padStart(4, '0');
        return suffix ? `${hex}H` : hex;
    }

    class CPU {
        constructor() {
            this.registers = {
                AX: 0x0000,
                BX: 0x0000,
                IP: 0x0000
            };

            this.flags = {
                ZF: 0,
                CF: 0
            };

            this.instructions = [];
            this.sourceLines = [];
            this.isAssembled = false;
            this.isHalted = false;
            this.isError = false;
            this.errorMessage = '';
            this.stepCount = 0;
            this.lastModifiedRegisters = new Set();
            this.lastModifiedFlags = new Set();
            this.executionTrace = [];
            this.currentInstruction = null;
        }

        /**
         * Reset CPU to initial state
         */
        reset() {
            this.registers.AX = 0x0000;
            this.registers.BX = 0x0000;
            this.registers.IP = 0x0000;

            this.flags.ZF = 0;
            this.flags.CF = 0;

            this.isHalted = false;
            this.isError = false;
            this.errorMessage = '';
            this.stepCount = 0;
            this.lastModifiedRegisters.clear();
            this.lastModifiedFlags.clear();
            this.executionTrace = [];
            this.currentInstruction = null;
        }

        /**
         * Get register value
         */
        getRegister(name) {
            const upper = name.toUpperCase();
            if (upper in this.registers) {
                return this.registers[upper];
            }
            throw new Error(`Unknown register: ${name}`);
        }

        /**
         * Set register value (16-bit masked)
         */
        setRegister(name, val) {
            const upper = name.toUpperCase();
            if (upper in this.registers) {
                const val16 = val & 0xFFFF;
                if (this.registers[upper] !== val16) {
                    this.registers[upper] = val16;
                    this.lastModifiedRegisters.add(upper);
                }
                return val16;
            }
            throw new Error(`Unknown register: ${name}`);
        }

        /**
         * Assemble program: validates and parses instructions
         */
        assemble(sourceCode) {
            this.reset();
            this.instructions = [];
            this.sourceLines = sourceCode.split('\n');

            const supportedMnemonics = new Set(['MOV', 'ADD', 'HLT']);

            let instCounter = 0;
            for (let lineIdx = 0; lineIdx < this.sourceLines.length; lineIdx++) {
                const rawLine = this.sourceLines[lineIdx];
                // Strip comments
                const commentPos = rawLine.indexOf(';');
                let cleanLine = (commentPos !== -1 ? rawLine.substring(0, commentPos) : rawLine).trim();

                if (!cleanLine) continue;

                // Split mnemonic and operands
                const spacePos = cleanLine.search(/\s/);
                let mnemonic = '';
                let operandStr = '';

                if (spacePos === -1) {
                    mnemonic = cleanLine.toUpperCase();
                } else {
                    mnemonic = cleanLine.substring(0, spacePos).toUpperCase();
                    operandStr = cleanLine.substring(spacePos).trim();
                }

                if (!supportedMnemonics.has(mnemonic)) {
                    throw new Error(`Line ${lineIdx + 1}: Unsupported instruction '${mnemonic}'. Only MOV, ADD, and HLT are supported in this demonstration.`);
                }

                let operands = [];
                if (operandStr) {
                    operands = operandStr.split(',').map(s => s.trim()).filter(Boolean);
                }

                // Validate instruction operands
                if (mnemonic === 'HLT') {
                    if (operands.length !== 0) {
                        throw new Error(`Line ${lineIdx + 1}: HLT instruction takes no operands`);
                    }
                } else if (mnemonic === 'MOV' || mnemonic === 'ADD') {
                    if (operands.length !== 2) {
                        throw new Error(`Line ${lineIdx + 1}: ${mnemonic} requires 2 operands (e.g. ${mnemonic} AX, BX or ${mnemonic} AX, 0005H)`);
                    }

                    const dest = operands[0].toUpperCase();
                    if (dest !== 'AX' && dest !== 'BX') {
                        throw new Error(`Line ${lineIdx + 1}: Destination operand must be AX or BX (got '${operands[0]}')`);
                    }

                    const src = operands[1].toUpperCase();
                    const immVal = parseImmediate(operands[1]);

                    if (src !== 'AX' && src !== 'BX' && immVal === null) {
                        throw new Error(`Line ${lineIdx + 1}: Invalid source operand '${operands[1]}'. Must be AX, BX, or a 16-bit number (e.g., 0005H)`);
                    }
                }

                this.instructions.push({
                    index: instCounter,
                    line: lineIdx + 1,
                    text: cleanLine,
                    mnemonic: mnemonic,
                    rawOperands: operands
                });

                instCounter++;
            }

            if (this.instructions.length === 0) {
                throw new Error("Source contains no executable instructions.");
            }

            this.isAssembled = true;
            this.registers.IP = 0;

            return {
                instructionCount: this.instructions.length
            };
        }

        /**
         * Step: Execute exactly one instruction
         */
        step() {
            if (!this.isAssembled) {
                throw new Error("Program is not assembled.");
            }
            if (this.isHalted) {
                return { isHalted: true, message: "Processor is halted (HLT)." };
            }
            if (this.isError) {
                return { isError: true, message: this.errorMessage };
            }
            if (this.registers.IP < 0 || this.registers.IP >= this.instructions.length) {
                this.isHalted = true;
                return { isHalted: true, message: "End of instructions reached." };
            }

            this.lastModifiedRegisters.clear();
            this.lastModifiedFlags.clear();

            const currentIP = this.registers.IP;
            const inst = this.instructions[currentIP];
            this.currentInstruction = inst;

            const prevRegs = { ...this.registers };
            const prevFlags = { ...this.flags };

            let explanation = '';
            let calculationDetail = '';

            try {
                if (inst.mnemonic === 'MOV') {
                    const dest = inst.rawOperands[0].toUpperCase();
                    const srcStr = inst.rawOperands[1];
                    const srcUpper = srcStr.toUpperCase();

                    let val = 0;
                    if (srcUpper === 'AX' || srcUpper === 'BX') {
                        val = this.registers[srcUpper];
                    } else {
                        val = parseImmediate(srcStr) & 0xFFFF;
                    }

                    this.setRegister(dest, val);
                    // 8086 specification: MOV does not modify flags
                    explanation = `Loads hexadecimal ${formatHex(val, false)} into register ${dest} (Flags unchanged).`;
                } else if (inst.mnemonic === 'ADD') {
                    const dest = inst.rawOperands[0].toUpperCase();
                    const srcStr = inst.rawOperands[1];
                    const srcUpper = srcStr.toUpperCase();

                    const destVal = this.registers[dest];
                    let srcVal = 0;

                    if (srcUpper === 'AX' || srcUpper === 'BX') {
                        srcVal = this.registers[srcUpper];
                    } else {
                        srcVal = parseImmediate(srcStr) & 0xFFFF;
                    }

                    // 16-bit addition in ALU
                    const sum = destVal + srcVal;
                    const res16 = sum & 0xFFFF;

                    this.setRegister(dest, res16);

                    // Update flags for ADD
                    this.flags.ZF = (res16 === 0) ? 1 : 0;
                    this.flags.CF = (sum > 0xFFFF) ? 1 : 0;

                    // In 8086, ADD always updates ZF and CF
                    this.lastModifiedFlags.add('ZF');
                    this.lastModifiedFlags.add('CF');

                    const zfText = this.flags.ZF ? 'ZF = 1 (Zero result)' : 'ZF = 0 (Non-zero result)';
                    const cfText = this.flags.CF ? 'CF = 1 (Carry generated)' : 'CF = 0 (No carry)';

                    explanation = `Adds ${srcUpper} to ${dest} and stores result in ${dest}. Flags updated: ${zfText}, ${cfText}.`;
                    calculationDetail = `${dest} = ${formatHex(destVal)} + ${formatHex(srcVal)} = ${formatHex(res16)}  |  ${zfText}, ${cfText}`;
                } else if (inst.mnemonic === 'HLT') {
                    this.isHalted = true;
                    explanation = `Stops program execution.`;
                }
            } catch (err) {
                this.isError = true;
                this.errorMessage = err.message;
                throw err;
            }

            // Increment IP to point to the next instruction
            this.registers.IP = currentIP + 1;
            this.stepCount++;

            // traceEntry records the resulting register and flag state
            const traceEntry = {
                step: this.stepCount,
                ip: this.registers.IP,
                instructionAddress: currentIP,
                instruction: inst.text,
                line: inst.line,
                prevRegisters: prevRegs,
                newRegisters: { ...this.registers },
                prevFlags: prevFlags,
                newFlags: { ...this.flags },
                explanation: explanation,
                calculationDetail: calculationDetail
            };

            this.executionTrace.push(traceEntry);

            return {
                isHalted: this.isHalted,
                step: this.stepCount,
                instruction: inst,
                currentIP: currentIP,
                nextIP: this.registers.IP,
                explanation: explanation,
                calculationDetail: calculationDetail,
                traceEntry: traceEntry,
                modifiedRegisters: Array.from(this.lastModifiedRegisters),
                modifiedFlags: Array.from(this.lastModifiedFlags)
            };
        }
    }

    return {
        CPU,
        parseImmediate,
        formatHex,
        MAX_STEPS
    };
}));
