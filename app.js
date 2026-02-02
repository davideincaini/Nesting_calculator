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

// Event Listeners
addBtn.addEventListener('click', addJobItem);
resetBtn.addEventListener('click', resetJob);
rollWidthInput.addEventListener('change', calculateJob); // Recalculate if roll width changes

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

    // Clear inputs (optional, maybe keep for rapid entry?)
    // quantityInput.value = '';
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

    if (orientation === 0) {
        // Logic 0 Degree: Fit across width
        // Assume longer side is length? The user inputs "Width" and "Length". 
        // We check if "Patch Width" fits in "Roll Width".
        // If Patch Width > Roll Width, maybe check invalid? Or rotate 90? 
        // For strict 0 degree, we assume Width aligns with Roll Width.

        let patchesPerRow = Math.floor(rollWidth / width);
        if (patchesPerRow < 1) {
            // Error case or swap? 
            // Let's assume strict input: if width > rollWidth, it's 0 patches per row (infinite length).
            // But let's be smart: check if Length fits in Width? No, that's rotation.
            patchesPerRow = 0;
        }

        if (patchesPerRow > 0) {
            const rows = Math.ceil(quantity / patchesPerRow);
            consumedLength = rows * length;
        } else {
            // Handle error visually? For now just huge length or alert
            console.error("Patch too wide for roll");
            return { lengthMm: 0 }; // Or error
        }

    } else if (orientation === 45) {
        // Logic 45 Degree: Bounding Box
        // Radians
        const rad = 45 * (Math.PI / 180);
        const cos45 = Math.cos(rad); // ~0.707
        const sin45 = Math.sin(rad); // ~0.707

        // Bounding Box Dimensions
        // New Width = w * cos + l * sin
        // New Length = w * sin + l * cos
        // Since sin45 = cos45, it is (w+l)*0.707

        const bboxW = (width + length) * cos45;
        const bboxH = (width + length) * sin45; // Same as width for 45 deg rect

        // Optimization: 
        // If bboxW fits in rollWidth multiple times
        let patchesPerRow = Math.floor(rollWidth / bboxW);

        // However, 45 degree patches can nest! (Triangular gaps)
        // Standard bounding box is worst case (stacking diamonds tip to tip).
        // Best case: interlocking.
        // Effective width per additional patch in a row = (width * cos + length * sin)? No.

        // For MVP: Use pure Bounding Box stacking (Worst Case / Simple Safe).
        // This guarantees no overlap.

        if (patchesPerRow < 1) {
            // Does not fit even once?
            console.error("Patch too wide even at 45");
            // Minimal check
        }

        if (patchesPerRow >= 1) {
            const rows = Math.ceil(quantity / patchesPerRow);
            consumedLength = rows * bboxH;
        }
    }

    return { lengthMm: consumedLength };
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
        const { width, length, quantity, orientation } = item;

        ctx.fillStyle = '#007aff'; // Patches color
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;

        if (orientation === 0) {
            let patchesPerRow = Math.floor(rollWidth / width);
            if (patchesPerRow < 1) return;

            let count = 0;
            let xRel = 0;
            let yRel = 0;

            while (count < quantity) {
                const xMm = xRel;
                const yMm = currentY + yRel;

                ctx.fillRect(xMm * scale, yMm * scale, width * scale, length * scale);
                ctx.strokeRect(xMm * scale, yMm * scale, width * scale, length * scale);

                count++;
                xRel += width;

                if (xRel + width > rollWidth) {
                    xRel = 0;
                    yRel += length;
                }
            }

            const rows = Math.ceil(quantity / patchesPerRow);
            currentY += (rows * length);

        } else if (orientation === 45) {
            const rad = 45 * (Math.PI / 180);
            const cos45 = Math.cos(rad);
            const sin45 = Math.sin(rad);
            const bboxW = (width + length) * cos45;
            const bboxH = (width + length) * sin45;

            let patchesPerRow = Math.floor(rollWidth / bboxW);
            if (patchesPerRow < 1) return;

            let count = 0;
            let xI = 0;
            let yI = 0;

            while (count < quantity) {
                const xPosMm = (xI * bboxW) + (bboxW / 2);
                const yPosMm = currentY + (yI * bboxH) + (bboxH / 2);

                ctx.save();
                ctx.translate(xPosMm * scale, yPosMm * scale);
                ctx.rotate(rad);
                // Draw centered at origin
                ctx.fillRect((-width / 2) * scale, (-length / 2) * scale, width * scale, length * scale);
                ctx.strokeRect((-width / 2) * scale, (-length / 2) * scale, width * scale, length * scale);
                ctx.restore();

                count++;
                xI++;

                if (xI >= patchesPerRow) {
                    xI = 0;
                    yI++;
                }
            }

            const rows = Math.ceil(quantity / patchesPerRow);
            currentY += (rows * bboxH);
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
