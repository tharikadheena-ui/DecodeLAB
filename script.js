/**
 * DecodeLab — 8086 Instruction Execution Simulator
 * UI Controller: Step, Run, Reset, Code Highlighter, Flags & Trace Management
 */

document.addEventListener('DOMContentLoaded', () => {
    if (typeof CPU8086 === 'undefined') {
        console.error("CPU8086 engine not found!");
        return;
    }

    const { CPU, formatHex } = CPU8086;
    const cpu = new CPU();

    // DOM Elements
    const editor = document.getElementById('assembly-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const codeOverlay = document.getElementById('code-overlay');
    const noticeBar = document.getElementById('notice-bar');
    const noticeText = document.getElementById('notice-text');
    const statusBadge = document.getElementById('status-badge');

    // Controls
    const btnStep = document.getElementById('btn-step');
    const btnRun = document.getElementById('btn-run');
    const btnReset = document.getElementById('btn-reset');

    // 4 Instruction Cycle Stages
    const stageFetch = document.getElementById('stage-fetch');
    const stageDecode = document.getElementById('stage-decode');
    const stageExecute = document.getElementById('stage-execute');
    const stageWrite = document.getElementById('stage-write');

    // Registers & Flags
    const valAX = document.getElementById('val-AX');
    const valBX = document.getElementById('val-BX');
    const valIP = document.getElementById('val-IP');
    const cardAX = document.getElementById('card-AX');
    const cardBX = document.getElementById('card-BX');
    const cardIP = document.getElementById('card-IP');

    const valZF = document.getElementById('val-ZF');
    const valCF = document.getElementById('val-CF');
    const cardZF = document.getElementById('card-ZF');
    const cardCF = document.getElementById('card-CF');
    const statusZF = document.getElementById('status-ZF');
    const statusCF = document.getElementById('status-CF');

    // Explanation & Success Banner
    const expInstruction = document.getElementById('exp-instruction');
    const expText = document.getElementById('exp-text');
    const expCalc = document.getElementById('exp-calc');
    const successBanner = document.getElementById('success-banner');

    // Trace Table
    const traceBody = document.getElementById('trace-body');

    let isRunning = false;
    let runTimer = null;

    // =========================================================================
    // 1. Syntax Highlighter & Line Number Tracking
    // =========================================================================
    function updateCodeView() {
        const text = editor.value;
        const lines = text.split('\n');

        // Dynamically create exact matching line numbers for all lines
        let lineNumsHtml = '';
        const currentExecLine = (cpu.isAssembled && !cpu.isHalted && cpu.registers.IP < cpu.instructions.length)
            ? cpu.instructions[cpu.registers.IP].line
            : -1;

        for (let i = 1; i <= lines.length; i++) {
            const isActive = (i === currentExecLine);
            lineNumsHtml += `<span class="line-num ${isActive ? 'active' : ''}">${i}</span>`;
        }
        lineNumbers.innerHTML = lineNumsHtml;

        // Overlay with syntax highlighting & current executing line
        let overlayHtml = '';
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i];
            const lineNum = i + 1;
            const isExec = (lineNum === currentExecLine);

            let escaped = line
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            // Comments
            let commentPart = '';
            const cIdx = escaped.indexOf(';');
            if (cIdx !== -1) {
                commentPart = `<span class="tok-comment">${escaped.slice(cIdx)}</span>`;
                escaped = escaped.slice(0, cIdx);
            }

            // Syntax replacements
            escaped = escaped.replace(/\b(MOV|ADD|HLT)\b/gi, '<span class="tok-mnemonic">$1</span>');
            escaped = escaped.replace(/\b(AX|BX)\b/gi, '<span class="tok-reg">$1</span>');
            escaped = escaped.replace(/\b([0-9][0-9a-fA-F]*[hH]|0x[0-9a-fA-F]+|\d+)\b/g, '<span class="tok-imm">$&</span>');

            const fullLine = escaped + commentPart;
            if (isExec) {
                overlayHtml += `<span class="exec-line">${fullLine || ' '}</span>\n`;
            } else {
                overlayHtml += (fullLine || ' ') + '\n';
            }
        }
        codeOverlay.innerHTML = overlayHtml;
    }

    editor.addEventListener('input', () => {
        updateCodeView();
        cpu.isAssembled = false;
        setStatus('READY', 'ready');
        hideNotice();
    });

    editor.addEventListener('scroll', () => {
        codeOverlay.scrollTop = editor.scrollTop;
        codeOverlay.scrollLeft = editor.scrollLeft;
        lineNumbers.scrollTop = editor.scrollTop;
    });

    // Sync line numbers on keyup/change/paste
    editor.addEventListener('keyup', updateCodeView);
    editor.addEventListener('paste', () => setTimeout(updateCodeView, 0));

    // =========================================================================
    // 2. Status & Alerts
    // =========================================================================
    function setStatus(text, className) {
        statusBadge.textContent = text.toUpperCase();
        statusBadge.className = `status-badge ${className}`;
    }

    function showNotice(msg, type = 'info') {
        noticeText.textContent = msg;
        noticeBar.className = `notice-bar ${type}`;
    }

    function hideNotice() {
        noticeBar.className = 'notice-bar hidden';
    }

    // =========================================================================
    // 3. Render CPU Registers & Flags
    // =========================================================================
    function renderState(modifiedRegs = [], modifiedFlags = []) {
        valAX.textContent = formatHex(cpu.registers.AX);
        valBX.textContent = formatHex(cpu.registers.BX);
        valIP.textContent = formatHex(cpu.registers.IP);

        // Flash modified registers
        cardAX.classList.remove('changed');
        cardBX.classList.remove('changed');
        cardIP.classList.remove('changed');

        if (modifiedRegs.includes('AX')) {
            void cardAX.offsetWidth;
            cardAX.classList.add('changed');
        }
        if (modifiedRegs.includes('BX')) {
            void cardBX.offsetWidth;
            cardBX.classList.add('changed');
        }

        // Flags values & active highlights
        valZF.textContent = cpu.flags.ZF;
        valCF.textContent = cpu.flags.CF;

        cardZF.classList.toggle('flag-set', cpu.flags.ZF === 1);
        cardCF.classList.toggle('flag-set', cpu.flags.CF === 1);

        if (statusZF) {
            statusZF.textContent = cpu.flags.ZF === 1 ? 'Result = 0 (SET)' : 'Result ≠ 0 (Clear)';
        }
        if (statusCF) {
            statusCF.textContent = cpu.flags.CF === 1 ? 'Carry Out (SET)' : 'No Carry (Clear)';
        }

        cardZF.classList.remove('changed');
        cardCF.classList.remove('changed');

        if (modifiedFlags.includes('ZF')) {
            void cardZF.offsetWidth;
            cardZF.classList.add('changed');
        }
        if (modifiedFlags.includes('CF')) {
            void cardCF.offsetWidth;
            cardCF.classList.add('changed');
        }

        updateCodeView();
    }

    // =========================================================================
    // 4. 4-Stage Instruction Cycle (FETCH -> DECODE -> EXECUTE -> WRITE)
    // =========================================================================
    function clearCycleStages() {
        stageFetch.classList.remove('active-stage');
        stageDecode.classList.remove('active-stage');
        stageExecute.classList.remove('active-stage');
        stageWrite.classList.remove('active-stage');
    }

    function animateInstructionCycle(onWriteback, onFinish) {
        clearCycleStages();

        // 1. FETCH
        stageFetch.classList.add('active-stage');

        setTimeout(() => {
            // 2. DECODE
            stageFetch.classList.remove('active-stage');
            stageDecode.classList.add('active-stage');

            setTimeout(() => {
                // 3. EXECUTE (ALU calculation)
                stageDecode.classList.remove('active-stage');
                stageExecute.classList.add('active-stage');

                setTimeout(() => {
                    // 4. WRITE (Result stored in register AX/BX, flags and IP updated)
                    stageExecute.classList.remove('active-stage');
                    stageWrite.classList.add('active-stage');

                    if (onWriteback) onWriteback();

                    setTimeout(() => {
                        stageWrite.classList.remove('active-stage');
                        if (onFinish) onFinish();
                    }, 180);
                }, 130);
            }, 130);
        }, 130);
    }

    // =========================================================================
    // 5. Execution Trace Table (with dedicated ZF and CF columns!)
    // =========================================================================
    function addTraceRow(traceEntry) {
        const emptyRow = traceBody.querySelector('.empty-trace');
        if (emptyRow) {
            traceBody.innerHTML = '';
        }

        const prevLatest = traceBody.querySelector('.latest');
        if (prevLatest) prevLatest.classList.remove('latest');

        const zfColor = traceEntry.newFlags.ZF ? '#0284c7' : '#64748b';
        const cfColor = traceEntry.newFlags.CF ? '#0284c7' : '#64748b';

        const tr = document.createElement('tr');
        tr.className = 'latest';
        tr.innerHTML = `
            <td>#${traceEntry.step}</td>
            <td style="color: #b45309; font-weight: 600;">${formatHex(traceEntry.newRegisters.IP)}</td>
            <td style="color: #0284c7; font-weight: 600;">${traceEntry.instruction}</td>
            <td style="color: #0f172a; font-weight: 600;">${formatHex(traceEntry.newRegisters.AX)}</td>
            <td style="color: #0f172a; font-weight: 600;">${formatHex(traceEntry.newRegisters.BX)}</td>
            <td style="color: ${zfColor}; font-weight: 700; text-align: center;">${traceEntry.newFlags.ZF}</td>
            <td style="color: ${cfColor}; font-weight: 700; text-align: center;">${traceEntry.newFlags.CF}</td>
            <td style="color: #475569; font-family: var(--font-sans); font-size: 11px;">${traceEntry.explanation}</td>
        `;

        traceBody.appendChild(tr);
        tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function clearTrace() {
        traceBody.innerHTML = `
            <tr class="empty-trace">
                <td colspan="8">No instructions executed yet.</td>
            </tr>
        `;
    }

    // =========================================================================
    // 6. Core Execution Actions: Step, Run, Reset
    // =========================================================================
    function ensureAssembled() {
        if (!cpu.isAssembled) {
            hideNotice();
            try {
                cpu.assemble(editor.value);
                setStatus('READY', 'ready');
                return true;
            } catch (err) {
                setStatus('ERROR', 'error');
                showNotice(err.message, 'error');
                return false;
            }
        }
        return true;
    }

    function doStep(onComplete) {
        if (!ensureAssembled()) return;

        if (cpu.isHalted) {
            setStatus('HALTED', 'halted');
            showNotice("Execution completed (HLT reached). Click Reset to start again.", 'info');
            successBanner.classList.remove('hidden');
            if (onComplete) onComplete(true);
            return;
        }

        const currentInst = cpu.instructions[cpu.registers.IP];

        // Animate 4 stages: Fetch -> Decode -> Execute -> Write
        animateInstructionCycle(
            // On Write stage: execute step and commit state
            () => {
                try {
                    const stepResult = cpu.step();

                    // Update explanation
                    expInstruction.textContent = currentInst.text;
                    expText.textContent = stepResult.explanation;

                    if (stepResult.calculationDetail) {
                        expCalc.textContent = stepResult.calculationDetail;
                        expCalc.classList.remove('hidden');
                    } else {
                        expCalc.classList.add('hidden');
                    }

                    renderState(stepResult.modifiedRegisters, stepResult.modifiedFlags);
                    addTraceRow(stepResult.traceEntry);

                    if (stepResult.isHalted) {
                        setStatus('HALTED', 'halted');
                        showNotice("Program execution halted (HLT). All instructions executed successfully.", 'info');
                        successBanner.classList.remove('hidden');
                    } else {
                        setStatus('READY', 'ready');
                    }
                } catch (err) {
                    setStatus('ERROR', 'error');
                    showNotice(err.message, 'error');
                }
            },
            // On Finish of Write stage
            () => {
                if (onComplete) onComplete(cpu.isHalted);
            }
        );
    }

    function doRun() {
        if (!ensureAssembled()) return;

        if (cpu.isHalted) {
            doReset();
        }

        isRunning = true;
        setStatus('RUNNING', 'running');
        btnRun.disabled = true;
        btnStep.disabled = true;

        function stepLoop() {
            if (!isRunning) return;

            doStep((isDone) => {
                if (isDone || cpu.isHalted) {
                    isRunning = false;
                    btnRun.disabled = false;
                    btnStep.disabled = false;
                } else {
                    runTimer = setTimeout(stepLoop, 400);
                }
            });
        }

        stepLoop();
    }

    function doReset() {
        isRunning = false;
        if (runTimer) clearTimeout(runTimer);

        cpu.reset();
        cpu.isAssembled = false;

        btnRun.disabled = false;
        btnStep.disabled = false;

        setStatus('READY', 'ready');
        hideNotice();

        expInstruction.textContent = '--';
        expText.textContent = 'Click Step or Run to begin execution.';
        expCalc.classList.add('hidden');
        successBanner.classList.add('hidden');

        clearCycleStages();
        clearTrace();
        ensureAssembled();
        renderState();
    }

    btnStep.addEventListener('click', () => {
        if (isRunning) return;
        doStep();
    });

    btnRun.addEventListener('click', () => {
        if (isRunning) return;
        doRun();
    });

    btnReset.addEventListener('click', doReset);

    // Initial setup
    ensureAssembled();
    renderState();
});
