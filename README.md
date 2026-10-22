# DecodeLab — 8086 Instruction Execution Simulator

> **Computer Organization and Architecture (COA) Educational Demonstration**  
> *"Assembly Language Programming and Instruction Execution in the Intel 8086 Microprocessor"*

---

## 1. Project Overview

**DecodeLab** is an interactive, browser-based educational simulator designed for undergraduate Computer Science and Engineering students. It demonstrates the execution of a fundamental 8086 assembly language program:

```asm
MOV AX, 0005H
MOV BX, 0003H
ADD AX, BX
HLT
```

The simulator demonstrates:
1. How 16-bit registers (`AX` and `BX`) load immediate hexadecimal values.
2. How the Arithmetic Logic Unit (ALU) performs 16-bit addition and stores the sum in the accumulator (`AX`).
3. How status flags (Zero Flag `ZF` and Carry Flag `CF`) are evaluated.
4. How the sequential 4-stage instruction cycle progresses: **Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ Write**.

---

## 2. Visual Layout (Light Theme Wireframe Alignment)

The frontend features a clean **light developer theme** directly matching the reference wireframe:
- **Canvas**: Light grey/white canvas with subtle engineering grid dots (`#cbd5e1`).
- **Application Frame**: Solid border enclosing the workspace.
- **Top Header**: Full-width light grey banner (`#e5e9f0`) with DecodeLab branding and live status indicator.
- **Toolbar Buttons**: 3 distinct dark teal rectangular buttons (`#1b6067`) for **Step**, **Run**, and **Reset**, positioned on the left above the code panel.
- **Two-Column Split**:
  - **Left Panel (~35% width)**: 8086 Assembly code editor with line numbers and active executing line highlight.
  - **Right Panel (~65% width)**: Main processor workspace aligned with the left panel, housing the 4-stage instruction cycle, CPU registers, flags, explanation card, and trace table.

---

## 3. Core Features

### A. Assembly Code Panel
- Pre-loaded with the core demonstration program (`MOV AX, 0005H`, `MOV BX, 0003H`, `ADD AX, BX`, `HLT`).
- Allows editing while validating input. Any unsupported instruction (such as `SUB` or `JMP`) is rejected with a clear error message.
- Highlights the currently executing instruction corresponding to the Instruction Pointer (`IP`).
- Monospaced typography with dynamically synchronized line numbers.

### B. CPU Registers
Displays the essential registers for this demonstration:
- **`AX`** (Accumulator Register): Initial `0000H` $\rightarrow$ `0005H` after first instruction $\rightarrow$ `0008H` after `ADD`.
- **`BX`** (Base Register): Initial `0000H` $\rightarrow$ `0003H` after second instruction.
- **`IP`** (Instruction Pointer): Points to the index of the next instruction to fetch (`0000H` to `0003H`).

### C. Execution Controls
- **Step**: Executes exactly one instruction, advancing through the 4 instruction cycle stages and updating the UI.
- **Run**: Automatically steps through the program sequentially until `HLT` is encountered.
- **Reset**: Restores CPU registers (`AX=0`, `BX=0`, `IP=0`), flags (`ZF=0`, `CF=0`), and clears the trace log.

### D. Condition Code Flags
- **Zero Flag (`ZF`)**: Evaluated as `0` because the sum (`0008H`) is non-zero.
- **Carry Flag (`CF`)**: Evaluated as `0` because no unsigned arithmetic overflow occurred beyond 16 bits.
- `MOV` instructions do not alter the flags.

### E. Step-by-Step Educational Explanation
Each step displays a human-readable explanation:
- `MOV AX, 0005H` — Loads hexadecimal 0005 into register AX.
- `MOV BX, 0003H` — Loads hexadecimal 0003 into register BX.
- `ADD AX, BX` — Adds BX to AX and stores the result in AX.
  - Formatted calculation: **`AX = 0005H + 0003H = 0008H`**
- `HLT` — Stops program execution.
- A final success banner confirms that execution has halted with all expected values.

### F. 4-Stage Instruction Cycle (Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ Write)
Highlights each stage in real time during instruction execution:
1. **Fetch**: Fetches instruction from memory at `IP` into the instruction register.
2. **Decode**: Control unit decodes opcode and operand addressing modes.
3. **Execute**: ALU performs the arithmetic calculation in the execution unit.
4. **Write**: Result is committed/written to the destination register (`AX` or `BX`), flags are set, and `IP` is incremented.

### G. Execution Trace Table
Logs each executed instruction with:
- Step number
- Instruction Pointer address (`IP`)
- Instruction text
- Updated values of `AX` and `BX`
- Plain-English operation summary

---

## 4. Expected Program Execution Flow

| Step | Instruction | AX | BX | IP | ZF | CF | Cycle Stage Highlights | Educational Explanation |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| **Start** | Initial State | `0000H` | `0000H` | `0000H` | `0` | `0` | Idle | Ready to execute. |
| **Step 1** | `MOV AX, 0005H` | **`0005H`** | `0000H` | `0001H` | `0` | `0` | Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ **Write** | Loads 0005H into register AX. |
| **Step 2** | `MOV BX, 0003H` | `0005H` | **`0003H`** | `0002H` | `0` | `0` | Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ **Write** | Loads 0003H into register BX. |
| **Step 3** | `ADD AX, BX` | **`0008H`** | `0003H` | `0003H` | `0` | `0` | Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ **Write** | `AX = 0005H + 0003H = 0008H`. |
| **Step 4** | `HLT` | `0008H` | `0003H` | `0004H` | `0` | `0` | Fetch $\rightarrow$ Decode $\rightarrow$ Execute $\rightarrow$ **Write** | Stops program execution. |

---

## 5. Verification and Automated Test Results

The test suite in [`test_engine.js`](file:///c:/Users/Tharika/Desktop/COA_Proj/test_engine.js) was executed via Node.js:

```bash
node test_engine.js
```

### Actual Test Output:
```
=================================================
  Running DecodeLab Simplified 8086 Test Suite
=================================================

Requirement 1 to 6: Step-by-Step Instruction Execution
  ✓ PASS: Initial IP is 0 (Expected: 0, Got: 0)
  ✓ PASS: Initial AX is 0 (Expected: 0, Got: 0)
  ✓ PASS: Initial BX is 0 (Expected: 0, Got: 0)
  ✓ PASS: Step 1 executed MOV (Expected: MOV, Got: MOV)
  ✓ PASS: AX is 0005H after first instruction (Expected: 5, Got: 5)
  ✓ PASS: CF is 0 (MOV does not modify flags) (Expected: 0, Got: 0)
  ✓ PASS: ZF is 0 (MOV does not modify flags) (Expected: 0, Got: 0)
  ✓ PASS: IP advanced to 1 (Expected: 1, Got: 1)
  ✓ PASS: Step 2 executed MOV (Expected: MOV, Got: MOV)
  ✓ PASS: BX is 0003H after second instruction (Expected: 3, Got: 3)
  ✓ PASS: AX remains 0005H (Expected: 5, Got: 5)
  ✓ PASS: CF remains 0 (Expected: 0, Got: 0)
  ✓ PASS: ZF remains 0 (Expected: 0, Got: 0)
  ✓ PASS: IP advanced to 2 (Expected: 2, Got: 2)
  ✓ PASS: Step 3 executed ADD (Expected: ADD, Got: ADD)
  ✓ PASS: AX is 0008H after ADD AX, BX (Expected: 8, Got: 8)
  ✓ PASS: BX remains 0003H (Expected: 3, Got: 3)
  ✓ PASS: Carry Flag (CF) is 0 (Expected: 0, Got: 0)
  ✓ PASS: Zero Flag (ZF) is 0 (Expected: 0, Got: 0)
  ✓ PASS: Calculation detail is exact (Expected: AX = 0005H + 0003H = 0008H, Got: AX = 0005H + 0003H = 0008H)
  ✓ PASS: IP advanced to 3 (Expected: 3, Got: 3)
  ✓ PASS: Step 4 executed HLT (Expected: HLT, Got: HLT)
  ✓ PASS: HLT stops execution (isHalted = true)
  ✓ PASS: Subsequent step returns halted status
  ✓ PASS: Final AX remains 0008H (Expected: 8, Got: 8)
  ✓ PASS: Final BX remains 0003H (Expected: 3, Got: 3)

Requirement 7: Reset Restoring Initial State
  ✓ PASS: CPU is halted prior to reset
  ✓ PASS: AX was modified to 0008H (Expected: 8, Got: 8)
  ✓ PASS: AX reset to 0000H (Expected: 0, Got: 0)
  ✓ PASS: BX reset to 0000H (Expected: 0, Got: 0)
  ✓ PASS: IP reset to 0000H (Expected: 0, Got: 0)
  ✓ PASS: CF reset to 0 (Expected: 0, Got: 0)
  ✓ PASS: ZF reset to 0 (Expected: 0, Got: 0)
  ✓ PASS: isHalted reset to false (Expected: false, Got: false)
  ✓ PASS: stepCount reset to 0 (Expected: 0, Got: 0)

Requirement 8: Run Executing Complete Program Correctly
  ✓ PASS: Run executed exactly 4 instructions to HLT (Expected: 4, Got: 4)
  ✓ PASS: Final AX = 0008H (Expected: 8, Got: 8)
  ✓ PASS: Final BX = 0003H (Expected: 3, Got: 3)
  ✓ PASS: Final CF = 0 (Expected: 0, Got: 0)
  ✓ PASS: Final ZF = 0 (Expected: 0, Got: 0)
  ✓ PASS: Processor is halted at the end of Run

Requirement 9: Validation and Rejection of Unsupported Instructions
  ✓ PASS: Correctly caught error: Line 1: Unsupported instruction 'SUB'. Only MOV, ADD, and HLT are supported in this demonstration.
  ✓ PASS: Unsupported instruction was rejected

=================================================
  Test Summary: 43 / 43 passed, 0 failed.
=================================================
```

---

## 6. How to Run

1. Open [`index.html`](file:///c:/Users/Tharika/Desktop/COA_Proj/index.html) in any web browser.
2. Click **Step** to step through instruction by instruction (observing the 4 stages animate: `FETCH` $\rightarrow$ `DECODE` $\rightarrow$ `EXECUTE` $\rightarrow$ `WRITE`).
3. Click **Run** to execute automatically.
4. Click **Reset** to restore initial CPU state.
