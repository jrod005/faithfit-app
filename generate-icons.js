const fs = require('fs');
const zlib = require('zlib');

function createIcon(size, outputPath) {
    const width = size;
    const height = size;
    const rawData = Buffer.alloc((width * 4 + 1) * height);

    for (let y = 0; y < height; y++) {
        rawData[y * (width * 4 + 1)] = 0;
        for (let x = 0; x < width; x++) {
            const idx = y * (width * 4 + 1) + 1 + x * 4;
            const s = size / 512; // scale factor

            // Rounded rect mask
            const cornerR = size * 0.17;
            let inRect = true;
            const corners = [[cornerR, cornerR], [width-cornerR, cornerR], [cornerR, height-cornerR], [width-cornerR, height-cornerR]];
            for (const [ccx, ccy] of corners) {
                if ((x < cornerR || x > width-cornerR) && (y < cornerR || y > height-cornerR)) {
                    const dx = x - ccx, dy = y - ccy;
                    if (dx*dx + dy*dy > cornerR*cornerR) inRect = false;
                }
            }

            if (!inRect) {
                rawData[idx] = 0; rawData[idx+1] = 0; rawData[idx+2] = 0; rawData[idx+3] = 0;
                continue;
            }

            // Dark background with subtle gradient
            const bgShade = Math.round(18 + (y/height) * 6);
            let r = bgShade, g = bgShade, b = bgShade, a = 255;

            const cx = width / 2;
            const bodyCy = height * 0.34;

            // --- WINGS ---
            function inWing(px, py, side) {
                const wingBase = side === 'left' ? cx - 30*s : cx + 30*s;
                const dir = side === 'left' ? -1 : 1;
                const relX = (px - wingBase) * dir;
                const relY = py - (bodyCy - 15*s);
                if (relX < 5*s || relX > 150*s) return false;
                const t = relX / (150*s);
                const topEdge = -70*s * Math.sin(t * Math.PI * 0.9) * (1 - t*0.3);
                const botEdge = 40*s * Math.sin(t * Math.PI * 0.7) * (1 - t*0.5);
                if (relY < topEdge || relY > botEdge) return false;
                // Feather lines
                const featherIntensity = 0.7 + 0.3 * Math.sin(relX / (8*s));
                return featherIntensity;
            }

            const leftWing = inWing(x, y, 'left');
            const rightWing = inWing(x, y, 'right');
            if (leftWing) {
                const shade = Math.round(100 + leftWing * 55);
                r = shade; g = shade; b = shade;
            }
            if (rightWing) {
                const shade = Math.round(100 + rightWing * 55);
                r = shade; g = shade; b = shade;
            }

            // --- HALO ---
            const haloCy = bodyCy - 48*s;
            const haloRx = 32*s, haloRy = 8*s;
            const haloDist = Math.sqrt(((x-cx)/haloRx)**2 + ((y-haloCy)/haloRy)**2);
            if (Math.abs(haloDist - 1) < 0.18) {
                const glow = Math.max(0, 1 - Math.abs(haloDist - 1) / 0.18);
                r = Math.round(200 + 55 * glow);
                g = Math.round(200 + 55 * glow);
                b = Math.round(200 + 55 * glow);
            }

            // --- HEAD ---
            const headR = 20*s;
            const headDist = Math.sqrt((x-cx)**2 + (y-bodyCy)**2);
            if (headDist < headR) {
                const shade = Math.round(190 - (headDist/headR) * 50);
                r = shade; g = shade; b = shade;
            }

            // --- NECK ---
            if (Math.abs(x - cx) < 6*s && y > bodyCy + 18*s && y < bodyCy + 28*s) {
                r = 165; g = 165; b = 165;
            }

            // --- TORSO (V-shape) ---
            const torsoTop = bodyCy + 28*s;
            const torsoBot = bodyCy + 95*s;
            if (y >= torsoTop && y <= torsoBot) {
                const t = (y - torsoTop) / (torsoBot - torsoTop);
                const halfW = (30 - t * 8) * s; // narrower at bottom
                if (Math.abs(x - cx) < halfW) {
                    const edgeFade = 1 - Math.abs(x - cx) / halfW;
                    const shade = Math.round(150 + edgeFade * 30 - t * 20);
                    r = shade; g = shade; b = shade;
                }
            }

            // --- ARMS (raised overhead holding barbell) ---
            function distToLine(px, py, x1, y1, x2, y2) {
                const ldx = x2-x1, ldy = y2-y1;
                const len2 = ldx*ldx + ldy*ldy;
                let t = ((px-x1)*ldx + (py-y1)*ldy) / len2;
                t = Math.max(0, Math.min(1, t));
                const closestX = x1 + t*ldx, closestY = y1 + t*ldy;
                return Math.sqrt((px-closestX)**2 + (py-closestY)**2);
            }

            const shoulderY = torsoTop + 5*s;
            const armThick = 7*s;
            // Upper arms to hands
            const lHandX = cx - 105*s, rHandX = cx + 105*s;
            const handY = bodyCy - 10*s;
            const lShX = cx - 28*s, rShX = cx + 28*s;

            // Left upper arm + forearm
            const lElbowX = cx - 65*s, lElbowY = bodyCy + 15*s;
            const dLA1 = distToLine(x, y, lShX, shoulderY, lElbowX, lElbowY);
            const dLA2 = distToLine(x, y, lElbowX, lElbowY, lHandX, handY);
            if (dLA1 < armThick || dLA2 < armThick) {
                r = 170; g = 170; b = 170;
            }
            // Right upper arm + forearm
            const rElbowX = cx + 65*s, rElbowY = bodyCy + 15*s;
            const dRA1 = distToLine(x, y, rShX, shoulderY, rElbowX, rElbowY);
            const dRA2 = distToLine(x, y, rElbowX, rElbowY, rHandX, handY);
            if (dRA1 < armThick || dRA2 < armThick) {
                r = 170; g = 170; b = 170;
            }

            // --- BARBELL ---
            const barY2 = handY - 2*s;
            const barH = 5*s;
            if (y >= barY2 && y <= barY2 + barH && Math.abs(x - cx) < 145*s) {
                r = 140; g = 140; b = 140;
            }

            // Plates (3 per side, different sizes)
            const plateSets = [
                { offset: -125, w: 8, h: 24 },
                { offset: -112, w: 7, h: 19 },
                { offset: -100, w: 6, h: 15 },
                { offset: 125, w: 8, h: 24 },
                { offset: 112, w: 7, h: 19 },
                { offset: 100, w: 6, h: 15 },
            ];
            for (const p of plateSets) {
                const pcx = cx + p.offset * s;
                const pcy = barY2 + barH/2;
                if (Math.abs(x - pcx) < p.w*s && Math.abs(y - pcy) < p.h*s) {
                    const edgeDist = Math.min(Math.abs(x - pcx)/(p.w*s), Math.abs(y - pcy)/(p.h*s));
                    const shade = Math.round(75 + edgeDist * 30);
                    r = shade; g = shade; b = shade;
                }
            }

            // --- LEGS ---
            const legTop = torsoBot;
            const legBot = torsoBot + 55*s;
            if (y >= legTop && y <= legBot) {
                const t = (y - legTop) / (legBot - legTop);
                const leftLegX = cx - 14*s - t * 12*s;
                const rightLegX = cx + 14*s + t * 12*s;
                const legW = 6*s;
                if (Math.abs(x - leftLegX) < legW || Math.abs(x - rightLegX) < legW) {
                    r = 155; g = 155; b = 155;
                }
            }

            // --- TEXT: IRON ---
            const textTop = height * 0.72;
            const textBot = textTop + 32*s;
            const textMid = (textTop + textBot) / 2;
            if (y >= textTop && y <= textBot) {
                const th = textBot - textTop;
                const tw = 5.5*s; // stroke width
                let isText = false;

                // I
                const iX = cx - 78*s;
                if (Math.abs(x - iX) < tw) isText = true;

                // R
                const rX = cx - 48*s;
                if (Math.abs(x - rX) < tw && y >= textTop && y <= textBot) isText = true; // vert
                if (x >= rX && x <= rX + 28*s && Math.abs(y - textTop) < tw) isText = true; // top bar
                if (x >= rX && x <= rX + 24*s && Math.abs(y - textMid) < tw) isText = true; // mid bar
                if (Math.abs(x - (rX + 28*s)) < tw && y >= textTop && y <= textMid) isText = true; // right vert
                // R diagonal leg
                const rDiagT = (y - textMid) / (textBot - textMid);
                if (rDiagT >= 0 && rDiagT <= 1) {
                    const diagX = rX + 15*s + rDiagT * 18*s;
                    if (Math.abs(x - diagX) < tw) isText = true;
                }

                // O
                const oX = cx + 8*s;
                const oRx2 = 18*s, oRy2 = th/2;
                const oDist2 = ((x-oX)/oRx2)**2 + ((y-(textTop+th/2))/oRy2)**2;
                if (oDist2 <= 1 && oDist2 >= 0.5) isText = true;

                // N
                const nX = cx + 45*s;
                if (Math.abs(x - nX) < tw) isText = true; // left vert
                if (Math.abs(x - (nX + 33*s)) < tw) isText = true; // right vert
                // diagonal
                const nT = (y - textTop) / th;
                if (nT >= 0 && nT <= 1) {
                    const nDiagX = nX + nT * 33*s;
                    if (Math.abs(x - nDiagX) < tw) isText = true;
                }

                if (isText) {
                    r = 210; g = 210; b = 210;
                }
            }

            // --- TEXT: & FAITH (smaller, below) ---
            const fTextTop = textBot + 12*s;
            const fTextBot = fTextTop + 18*s;
            if (y >= fTextTop && y <= fTextBot) {
                // Simple horizontal line as divider above
                if (Math.abs(y - (fTextTop - 6*s)) < 1*s && Math.abs(x - cx) < 80*s) {
                    r = 80; g = 80; b = 80;
                }
            }

            // --- Tagline dots/line at very bottom ---
            if (Math.abs(y - (height * 0.92)) < 1*s && Math.abs(x - cx) < 65*s) {
                r = 55; g = 55; b = 55;
            }

            rawData[idx] = Math.min(255, r);
            rawData[idx+1] = Math.min(255, g);
            rawData[idx+2] = Math.min(255, b);
            rawData[idx+3] = a;
        }
    }

    const compressed = zlib.deflateSync(rawData);

    function crc32(data) {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    function chunk(type, data) {
        const len = Buffer.alloc(4);
        len.writeUInt32BE(data.length);
        const typeAndData = Buffer.concat([Buffer.from(type), data]);
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(typeAndData));
        return Buffer.concat([len, typeAndData, crc]);
    }

    const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

    const png = Buffer.concat([
        sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))
    ]);

    fs.writeFileSync(outputPath, png);
    console.log('Created ' + size + 'x' + size + ': ' + outputPath + ' (' + png.length + ' bytes)');
}

createIcon(192, 'C:/Users/jared/fitness-app/icons/icon-192.png');
createIcon(512, 'C:/Users/jared/fitness-app/icons/icon-512.png');
