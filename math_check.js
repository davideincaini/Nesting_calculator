const width = 600;
const length = 600;
const rollWidth = 1250;

const sq2 = Math.sqrt(2);
const wProj = width / sq2;
const lProj = length / sq2;
const bboxW = wProj + lProj; // 848.52
const stepX = wProj; // 424.26 (Short side projection)

console.log(`BBoxW: ${bboxW.toFixed(2)}`);
console.log(`StepX: ${stepX.toFixed(2)}`);

// Col 1 width = 848.52.
// Col 2 width = BBoxW + StepX ?
// Left Tip Col 1 at 0. Center at 424.26. Right Tip at 848.52.
// Col 2 Center at 424.26 + 424.26 = 848.52.
// Col 2 Right Tip at 848.52 + 424.26 = 1272.79.

const col2RightTip = bboxW + stepX;
console.log(`Col 2 Right Tip: ${col2RightTip.toFixed(2)}`);
console.log(`Fits in ${rollWidth}? ${col2RightTip <= rollWidth}`);

const maxFitWidth = (rollWidth - bboxW) / stepX;
console.log(`Max Cols Additional: ${Math.floor(maxFitWidth)}`);
console.log(`Total Cols: ${1 + Math.floor(maxFitWidth)}`);
