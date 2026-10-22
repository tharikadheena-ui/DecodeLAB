/**
 * DecodeLab — 8086 Simplified CPU Test Suite
 * Verifies:
 * 1. Step execution
 * 2. AX = 0005H after MOV AX, 0005H
 * 3. BX = 0003H after MOV BX, 0003H
 * 4. AX = 0008H after ADD AX, BX
 * 5. CF = 0 and ZF = 0 after addition
 * 6. HLT stops execution
 * 7. Reset restores initial state
 * 8. Run executes complete program correctly
 * 9. Validation of unsupported instructions
 * 10. IP in CPU REGISTERS matches IP in EXECUTION TRACE
 * 11. Comprehensive ZF and CF behavior:
 *     - Carry Flag on unsigned overflow (> 0xFFFF)
 *     - Zero Flag on zero result (== 0)
 *     - MOV preserving existing flags
 */

const { CPU, formatHex } = require('./cpu.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ✗ FAIL: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    totalTests++;
    if (actual === expected) {
        passedTests++;
        console.log(`  ✓ PASS: ${message} (Expected: ${expected}, Got: ${actual})`);
    } else {
        failedTests++;
        console.error(`  ✗ FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    }
}

console.log("=================================================");
console.log("  Running DecodeLab Simplified 8086 Test Suite");
console.log("=================================================\n");

const programCode = `
MOV AX, 0005H
MOV BX, 0003H
ADD AX, BX
HLT
`.trim();

// 1. Core Program Step-by-Step
console.log("Requirement 1 to 6 & 10: Step-by-Step Execution and IP Synchronization");
{
    const cpu = new CPU();
    cpu.assemble(programCode);

    assertEqual(cpu.registers.IP, 0, "Initial IP is 0");
    assertEqual(cpu.registers.AX, 0, "Initial AX is 0");
    assertEqual(cpu.registers.BX, 0, "Initial BX is 0");

    // Step 1: MOV AX, 0005H
    const step1 = cpu.step();
    assertEqual(step1.instruction.mnemonic, 'MOV', "Step 1 executed MOV");
    assertEqual(cpu.registers.AX, 0x0005, "AX is 0005H after first instruction");
    assertEqual(cpu.flags.CF, 0, "CF is 0 (MOV does not modify flags)");
    assertEqual(cpu.flags.ZF, 0, "ZF is 0 (MOV does not modify flags)");
    assertEqual(cpu.registers.IP, 1, "IP advanced to 1");
    assertEqual(step1.traceEntry.newRegisters.IP, cpu.registers.IP, "Trace IP matches CPU register IP (0001H)");

    // Step 2: MOV BX, 0003H
    const step2 = cpu.step();
    assertEqual(step2.instruction.mnemonic, 'MOV', "Step 2 executed MOV");
    assertEqual(cpu.registers.BX, 0x0003, "BX is 0003H after second instruction");
    assertEqual(cpu.registers.AX, 0x0005, "AX remains 0005H");
    assertEqual(cpu.flags.CF, 0, "CF remains 0");
    assertEqual(cpu.flags.ZF, 0, "ZF remains 0");
    assertEqual(cpu.registers.IP, 2, "IP advanced to 2");
    assertEqual(step2.traceEntry.newRegisters.IP, cpu.registers.IP, "Trace IP matches CPU register IP (0002H)");

    // Step 3: ADD AX, BX
    const step3 = cpu.step();
    assertEqual(step3.instruction.mnemonic, 'ADD', "Step 3 executed ADD");
    assertEqual(cpu.registers.AX, 0x0008, "AX is 0008H after ADD AX, BX");
    assertEqual(cpu.registers.BX, 0x0003, "BX remains 0003H");
    assertEqual(cpu.flags.CF, 0, "Carry Flag (CF) is 0");
    assertEqual(cpu.flags.ZF, 0, "Zero Flag (ZF) is 0");
    assert(step3.modifiedFlags.includes('ZF'), "ADD explicitly evaluated Zero Flag (ZF)");
    assert(step3.modifiedFlags.includes('CF'), "ADD explicitly evaluated Carry Flag (CF)");
    assertEqual(step3.traceEntry.newFlags.ZF, 0, "Trace table records ZF = 0");
    assertEqual(step3.traceEntry.newFlags.CF, 0, "Trace table records CF = 0");
    assertEqual(cpu.registers.IP, 3, "IP advanced to 3");
    assertEqual(step3.traceEntry.newRegisters.IP, cpu.registers.IP, "Trace IP matches CPU register IP (0003H)");

    // Step 4: HLT
    const step4 = cpu.step();
    assertEqual(step4.instruction.mnemonic, 'HLT', "Step 4 executed HLT");
    assert(cpu.isHalted, "HLT stops execution (isHalted = true)");
    assertEqual(step4.traceEntry.newRegisters.IP, cpu.registers.IP, "Trace IP matches CPU register IP (0004H)");

    // Subsequent step returns halted
    const step5 = cpu.step();
    assert(step5.isHalted, "Subsequent step returns halted status");
    assertEqual(cpu.registers.AX, 0x0008, "Final AX remains 0008H");
    assertEqual(cpu.registers.BX, 0x0003, "Final BX remains 0003H");
}

// 2. Comprehensive ZF and CF Calculation Tests
console.log("\nRequirement 11: Comprehensive ZF & CF Verification");
{
    // Test: Carry Flag and Zero Flag set on overflow to 0
    // 0xFFFF + 0x0001 = 0x10000 -> AX = 0x0000, CF = 1, ZF = 1
    const cpuOverflow = new CPU();
    cpuOverflow.assemble(`
        MOV AX, 0FFFFH
        MOV BX, 0001H
        ADD AX, BX
        HLT
    `);
    cpuOverflow.step(); // MOV AX, 0FFFFH
    cpuOverflow.step(); // MOV BX, 0001H
    const addResult = cpuOverflow.step(); // ADD AX, BX
    assertEqual(cpuOverflow.registers.AX, 0x0000, "0xFFFF + 0x0001 wraps to 0x0000 in 16-bit register");
    assertEqual(cpuOverflow.flags.CF, 1, "Carry Flag (CF) is SET to 1 on 16-bit overflow");
    assertEqual(cpuOverflow.flags.ZF, 1, "Zero Flag (ZF) is SET to 1 when result is 0x0000");

    // Test: Carry Flag set without Zero Flag
    // 0xFFFF + 0x0002 = 0x10001 -> AX = 0x0001, CF = 1, ZF = 0
    const cpuCarryOnly = new CPU();
    cpuCarryOnly.assemble(`
        MOV AX, 0FFFFH
        MOV BX, 0002H
        ADD AX, BX
        HLT
    `);
    cpuCarryOnly.step();
    cpuCarryOnly.step();
    cpuCarryOnly.step();
    assertEqual(cpuCarryOnly.registers.AX, 0x0001, "0xFFFF + 0x0002 wraps to 0x0001");
    assertEqual(cpuCarryOnly.flags.CF, 1, "Carry Flag (CF) is SET to 1 on overflow");
    assertEqual(cpuCarryOnly.flags.ZF, 0, "Zero Flag (ZF) is CLEAR (0) because result is non-zero (0x0001)");

    // Test: Zero Flag set without Carry Flag
    // 0x0000 + 0x0000 = 0x0000 -> AX = 0x0000, CF = 0, ZF = 1
    const cpuZeroOnly = new CPU();
    cpuZeroOnly.assemble(`
        MOV AX, 0000H
        MOV BX, 0000H
        ADD AX, BX
        HLT
    `);
    cpuZeroOnly.step();
    cpuZeroOnly.step();
    cpuZeroOnly.step();
    assertEqual(cpuZeroOnly.registers.AX, 0x0000, "0x0000 + 0x0000 = 0x0000");
    assertEqual(cpuZeroOnly.flags.CF, 0, "Carry Flag (CF) is CLEAR (0) because no overflow occurred");
    assertEqual(cpuZeroOnly.flags.ZF, 1, "Zero Flag (ZF) is SET to 1 because result is 0x0000");

    // Test: MOV preserving existing flags
    const cpuPreserve = new CPU();
    cpuPreserve.flags.ZF = 1;
    cpuPreserve.flags.CF = 1;
    cpuPreserve.assemble(`
        MOV AX, 0005H
        HLT
    `);
    cpuPreserve.flags.ZF = 1;
    cpuPreserve.flags.CF = 1;
    cpuPreserve.step(); // MOV AX, 0005H
    assertEqual(cpuPreserve.flags.ZF, 1, "MOV preserved existing ZF = 1");
    assertEqual(cpuPreserve.flags.CF, 1, "MOV preserved existing CF = 1");
}

// 7. Test Reset Functionality
console.log("\nRequirement 7: Reset Restoring Initial State");
{
    const cpu = new CPU();
    cpu.assemble(programCode);
    cpu.step(); // Step 1
    cpu.step(); // Step 2
    cpu.step(); // Step 3
    cpu.step(); // Step 4 (HLT)

    assert(cpu.isHalted, "CPU is halted prior to reset");
    assertEqual(cpu.registers.AX, 0x0008, "AX was modified to 0008H");

    cpu.reset();
    assertEqual(cpu.registers.AX, 0x0000, "AX reset to 0000H");
    assertEqual(cpu.registers.BX, 0x0000, "BX reset to 0000H");
    assertEqual(cpu.registers.IP, 0x0000, "IP reset to 0000H");
    assertEqual(cpu.flags.CF, 0, "CF reset to 0");
    assertEqual(cpu.flags.ZF, 0, "ZF reset to 0");
    assertEqual(cpu.isHalted, false, "isHalted reset to false");
    assertEqual(cpu.stepCount, 0, "stepCount reset to 0");
}

// 8. Test Run Functionality
console.log("\nRequirement 8: Run Executing Complete Program Correctly");
{
    const cpu = new CPU();
    cpu.assemble(programCode);

    let steps = 0;
    while (!cpu.isHalted && steps < 10) {
        cpu.step();
        steps++;
    }

    assertEqual(steps, 4, "Run executed exactly 4 instructions to HLT");
    assertEqual(cpu.registers.AX, 0x0008, "Final AX = 0008H");
    assertEqual(cpu.registers.BX, 0x0003, "Final BX = 0003H");
    assertEqual(cpu.flags.CF, 0, "Final CF = 0");
    assertEqual(cpu.flags.ZF, 0, "Final ZF = 0");
    assert(cpu.isHalted, "Processor is halted at the end of Run");
}

// 9. Test Error Handling for Unsupported Instructions
console.log("\nRequirement 9: Validation and Rejection of Unsupported Instructions");
{
    const cpu = new CPU();
    let threw = false;
    try {
        cpu.assemble("SUB AX, BX");
    } catch (err) {
        threw = true;
        assert(err.message.includes("Unsupported instruction"), `Correctly caught error: ${err.message}`);
    }
    assert(threw, "Unsupported instruction was rejected");
}

console.log("\n=================================================");
console.log(`  Test Summary: ${passedTests} / ${totalTests} passed, ${failedTests} failed.`);
console.log("=================================================");

if (failedTests > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
