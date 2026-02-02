
// Mock of calculation logic from app.js
function calculateGroup(item, rollWidth) {
    const { width, length, quantity, orientation } = item;
    let consumedLength = 0;

    if (orientation === 0) {
        let patchesPerRow = Math.floor(rollWidth / width);
        if (patchesPerRow < 1) {
            patchesPerRow = 0;
        }

        if (patchesPerRow > 0) {
            const rows = Math.ceil(quantity / patchesPerRow);
            consumedLength = rows * length;
        } else {
            return { lengthMm: 0, error: "Too wide" };
        }

    } else if (orientation === 45) {
        const rad = 45 * (Math.PI / 180);
        const cos45 = Math.cos(rad);
        const sin45 = Math.sin(rad);

        const bboxW = (width + length) * cos45;
        const bboxH = (width + length) * sin45;

        let patchesPerRow = Math.floor(rollWidth / bboxW);

        if (patchesPerRow >= 1) {
            const rows = Math.ceil(quantity / patchesPerRow);
            consumedLength = rows * bboxH;
        } else {
            return { lengthMm: 0, error: "Too wide even at 45" };
        }
    }

    return { lengthMm: consumedLength };
}

// Tests
console.log("Running Verification Tests...");

// Test 1: 0 Degree
// Roll 1000, Patch 100x100, Qty 10
const res1 = calculateGroup({ width: 100, length: 100, quantity: 10, orientation: 0 }, 1000);
console.log(`Test 1 (0 deg): Expected ~100. Got: ${res1.lengthMm.toFixed(2)}`);

if (Math.abs(res1.lengthMm - 100) < 1) console.log("PASS"); else console.log("FAIL");

// Test 2: 45 Degree
// Roll 1000, Patch 100x100, Qty 1
const res2 = calculateGroup({ width: 100, length: 100, quantity: 1, orientation: 45 }, 1000);
const expected2 = (100 + 100) * Math.sin(45 * Math.PI / 180);
console.log(`Test 2 (45 deg): Expected ~${expected2.toFixed(2)}. Got: ${res2.lengthMm.toFixed(2)}`);

if (Math.abs(res2.lengthMm - expected2) < 1) console.log("PASS"); else console.log("FAIL");

// Test 3: 0 Degree Wide (Fit 1)
// Roll 1000, Patch 600, Qty 2
const res3 = calculateGroup({ width: 600, length: 600, quantity: 2, orientation: 0 }, 1000);
// 1 per row, 2 rows. Length = 1200.
console.log(`Test 3 (0 deg wide): Expected 1200. Got: ${res3.lengthMm.toFixed(2)}`);
if (Math.abs(res3.lengthMm - 1200) < 1) console.log("PASS"); else console.log("FAIL");
