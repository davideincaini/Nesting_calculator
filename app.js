// App State
let jobItems = [];
const rollWidthInput = document.getElementById('rollWidth');
const addBtn = document.getElementById('addBtn');
const jobListEl = document.getElementById('jobList');
const resultsEl = document.getElementById('results');
const totalLengthEl = document.getElementById('totalLength');
const totalWasteEl = document.getElementById('totalWaste');
const resetBtn = document.getElementById('resetBtn');

// Inputs
const patchWidthInput = document.getElementById('patchWidth');
const patchLengthInput = document.getElementById('patchLength');
const quantityInput = document.getElementById('quantity');
const orientationInput = document.getElementById('orientation');

const templateSelect = document.getElementById('templateSelect');

// Event Listeners
addBtn.addEventListener('click', addJobItem);
resetBtn.addEventListener('click', resetJob);
rollWidthInput.addEventListener('change', calculateJob); // Recalculate if roll width changes

templateSelect.addEventListener('change', () => {
    const val = templateSelect.value;
    if (val === 'custom') return;

    // Format "LxW" (User: Primo parametro = Lunghezza, Secondo = Larghezza)
    const [l, w] = val.split('x').map(Number);
    if (!isNaN(w) && !isNaN(l)) {
        patchWidthInput.value = w;
        patchLengthInput.value = l;
    }
});

function addJobItem() {
    const width = parseFloat(patchWidthInput.value);
    const length = parseFloat(patchLengthInput.value);
    const quantity = parseInt(quantityInput.value);
    const orientation = parseInt(orientationInput.value);
    const rollWidth = parseFloat(rollWidthInput.value);

    // Validation
    if (!width || !length || !quantity || !rollWidth) {
        alert('Compila tutti i campi numerici.');
        return;
    }

    if (width > rollWidth && length > rollWidth) {
        // Simple check, real 45 check happens in calc
        if (orientation === 0 && width > rollWidth) {
            alert('La larghezza della patch supera la larghezza del rotolo!');
            return;
        }
    }

    const item = {
        id: Date.now(),
        width,
        length,
        quantity,
        orientation
    };

    jobItems.push(item);
    renderJobList();
    calculateJob();
}

function removeJobItem(id) {
    jobItems = jobItems.filter(item => item.id !== id);
    renderJobList();
    calculateJob();
}

function resetJob() {
    if (confirm('Cancellare tutta la lista?')) {
        jobItems = [];
        renderJobList();
        calculateJob();
    }
}

function renderJobList() {
    jobListEl.innerHTML = '';

    if (jobItems.length === 0) {
        jobListEl.innerHTML = '<div class="empty-state">Nessun gruppo aggiunto</div>';
        return;
    }

    jobItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'job-item';
        el.innerHTML = `
            <div class="job-info">
                <div><strong>${item.quantity}x</strong> [${item.width} x ${item.length} mm] @ ${item.orientation}°</div>
                <div class="job-details">Area Tot: ${((item.width * item.length * item.quantity) / 1000000).toFixed(2)} m²</div>
            </div>
            <button class="remove-btn" onclick="removeJobItem(${item.id})">&times;</button>
        `;
        jobListEl.appendChild(el);
    });
}

function calculateJob() {
    const rollWidth = parseFloat(rollWidthInput.value);

    if (!rollWidth || jobItems.length === 0) {
        totalLengthEl.innerText = '0 m';
        totalWasteEl.innerText = '0%';
        return;
    }

    let totalLengthMm = 0;
    let totalPatchAreaMm2 = 0;

    jobItems.forEach(item => {
        const groupRes = calculateGroup(item, rollWidth);
        item.placements = groupRes.placements; // Store for drawing
        totalLengthMm += groupRes.lengthMm;
        totalPatchAreaMm2 += (item.width * item.length * item.quantity);
    });

    // Formatting Results
    const totalLengthM = totalLengthMm / 1000;
    const usedAreaMm2 = totalLengthMm * rollWidth;

    let waste = 0;
    if (usedAreaMm2 > 0) {
        waste = ((usedAreaMm2 - totalPatchAreaMm2) / usedAreaMm2) * 100;
    }

    totalLengthEl.innerText = `${totalLengthM.toFixed(2)} m`;
    totalWasteEl.innerText = `${waste.toFixed(1)}%`;

    drawNesting(jobItems, rollWidth, totalLengthMm);
}

function calculateGroup(item, rollWidth) {
    const { width, length, quantity, orientation } = item;

    let consumedLength = 0;
    const placements = [];

    if (orientation === 0 || orientation === 90) {
        // Parametri effettivi in base alla rotazione
        // Se 0°: patchWidth lungo rollWidth
        // Se 90°: patchLength lungo rollWidth

        let effectiveWidth = width;
        let effectiveLength = length;
        let rotation = 0;

        if (orientation === 90) {
            effectiveWidth = length; // Si stende lungo la larghezza rotolo
            effectiveLength = width; // Si stende lungo la lunghezza rotolo
            rotation = 90;
        }

        let patchesPerRow = Math.floor(rollWidth / effectiveWidth);
        if (patchesPerRow < 1) patchesPerRow = 0;

        if (patchesPerRow > 0) {
            const rows = Math.ceil(quantity / patchesPerRow);
            consumedLength = rows * effectiveLength;

            // Generate Placements for Drawing
            let count = 0;
            let r = 0;
            let c = 0;
            while (count < quantity) {
                // Center coords relative to group start
                const cx = c * effectiveWidth + effectiveWidth / 2;
                const cy = r * effectiveLength + effectiveLength / 2;

                placements.push({
                    x: cx,
                    y: cy,
                    angle: rotation,
                    width: width, // Store ORIGINAL dims for drawing 
                    length: length
                });
                count++;
                c++;
                if (c >= patchesPerRow) {
                    c = 0;
                    r++;
                }
            }
        } else {
            return { lengthMm: 0, placements: [] };
        }

    } else if (orientation === 45) {
        // Logic 45 Degree: Greedy Best Fit (+/- 45) with SAT Collision

        // --- Helper: SAT Math ---
        const getAxes = (vertices) => {
            const axes = [];
            for (let i = 0; i < vertices.length; i++) {
                const p1 = vertices[i];
                const p2 = vertices[(i + 1) % vertices.length];
                const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
                const normal = { x: -edge.y, y: edge.x };
                const len = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
                axes.push({ x: normal.x / len, y: normal.y / len });
            }
            return axes;
        };

        const project = (vertices, axis) => {
            let min = Infinity, max = -Infinity;
            for (const v of vertices) {
                const proj = v.x * axis.x + v.y * axis.y;
                if (proj < min) min = proj;
                if (proj > max) max = proj;
            }
            return { min, max };
        };

        const checkOverlap = (rect1, rect2) => {
            const axes1 = getAxes(rect1);
            const axes2 = getAxes(rect2);
            const axes = [...axes1, ...axes2];
            for (const axis of axes) {
                const p1 = project(rect1, axis);
                const p2 = project(rect2, axis);
                if (p1.max < p2.min || p2.max < p1.min) return false;
            }
            return true;
        };

        const getVertices = (cx, cy, w, l, ang) => {
            const rad = ang * (Math.PI / 180);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const dx = w / 2;
            const dy = l / 2;
            const corners = [
                { x: -dx, y: -dy },
                { x: dx, y: -dy },
                { x: dx, y: dy },
                { x: -dx, y: dy }
            ];
            return corners.map(p => ({
                x: cx + (p.x * cos - p.y * sin),
                y: cy + (p.x * sin + p.y * cos)
            }));
        };

        const sq2 = Math.sqrt(2);
        const wProj = width / sq2;
        const lProj = length / sq2;
        const bboxW = wProj + lProj;
        const bboxH = wProj + lProj;

        // Grid (Lattice Candidates)
        // High Precision: Step size of 5mm for better packing density
        const step = 5;
        const minX = bboxW / 2;
        const maxX = rollWidth - (bboxW / 2);

        let candidates = [];
        // Scan limit: Estimate roughly based on quantity
        const estimatedLength = (quantity * bboxH) / Math.floor(rollWidth / bboxW);
        const maxYLimit = Math.max(estimatedLength * 2, bboxH * 4);

        for (let y = bboxH / 2; y < maxYLimit; y += step) {
            for (let x = minX; x <= maxX; x += step) {
                candidates.push({ x, y });
            }
        }

        const placedRects = [];

        // Greedy Loop
        for (let i = 0; i < quantity; i++) {
            let best = null;

            for (const pos of candidates) {
                // Try +45
                const vPlus = getVertices(pos.x, pos.y, width, length, 45);
                let collisionPlus = false;

                // Bounds check
                for (const v of vPlus) {
                    if (v.x < 0 || v.x > rollWidth) { collisionPlus = true; break; }
                }

                if (!collisionPlus) {
                    for (const existing of placedRects) {
                        if (checkOverlap(vPlus, existing)) { collisionPlus = true; break; }
                    }
                }

                if (!collisionPlus) {
                    best = { x: pos.x, y: pos.y, angle: 45, vertices: vPlus };
                    break;
                }

                // Try -45
                const vMinus = getVertices(pos.x, pos.y, width, length, -45);
                let collisionMinus = false;

                for (const v of vMinus) {
                    if (v.x < 0 || v.x > rollWidth) { collisionMinus = true; break; }
                }

                if (!collisionMinus) {
                    for (const existing of placedRects) {
                        if (checkOverlap(vMinus, existing)) { collisionMinus = true; break; }
                    }
                }

                if (!collisionMinus) {
                    best = { x: pos.x, y: pos.y, angle: -45, vertices: vMinus };
                    break;
                }
            }

            if (best) {
                placedRects.push(best.vertices);
                placements.push({ x: best.x, y: best.y, angle: best.angle, width, length });

                const endY = best.y + bboxH / 2;
                if (endY > consumedLength) consumedLength = endY;
            } else {
                console.error("Could not place patch " + i);
                // Fallback
                const safeY = consumedLength + bboxH;
                consumedLength += bboxH;
                placements.push({ x: rollWidth / 2, y: safeY, angle: 45, width, length });
            }
        }
    }

    return { lengthMm: consumedLength, placements };
}

// Global expose for inline HTML events if needed
window.removeJobItem = removeJobItem;

function drawNesting(items, rollWidth, totalLengthMm) {
    const canvas = document.getElementById('nestingCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Scale Logic
    const displayWidth = canvas.parentNode.clientWidth || 300;
    canvas.width = displayWidth;

    // Scale: px per mm
    const scale = displayWidth / rollWidth;

    // Height: totalLengthMm * scale
    const canvasHeight = Math.max(100, totalLengthMm * scale);
    canvas.height = canvasHeight;

    // Clear background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let currentY = 0; // In mm

    items.forEach(item => {
        const { placements } = item;

        ctx.fillStyle = '#007aff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        if (placements && placements.length > 0) {
            // Find Height of this group based on placements for Cursor Update
            let maxGroupY = 0;

            placements.forEach(p => {
                const cx = p.x * scale;
                const cy = (currentY + p.y) * scale;

                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(p.angle * (Math.PI / 180));
                ctx.fillRect((-p.width / 2) * scale, (-p.length / 2) * scale, p.width * scale, p.length * scale);
                ctx.strokeRect((-p.width / 2) * scale, (-p.length / 2) * scale, p.width * scale, p.length * scale);
                ctx.restore();

                // Extent calculation for Group Height
                // p.y is center relative to group top (0)
                // extent = center + projectedHeight/2
                let extH = p.length;
                if (p.angle !== 0) {
                    extH = (p.width + p.length) / Math.sqrt(2);
                }
                const bottomY = p.y + extH / 2;
                if (bottomY > maxGroupY) maxGroupY = bottomY;
            });

            currentY += maxGroupY;
        }

        // Separator
        ctx.beginPath();
        ctx.moveTo(0, currentY * scale);
        ctx.lineTo(canvas.width, currentY * scale);
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    });
}
