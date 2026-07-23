                    ctx.fillStyle = '#2e7d32';
                    ctx.fill();
                }
            }
            ctx.restore();

            // === RENDERING KEPALA ULAR ===
            ctx.save();
            ctx.translate(headCX, headCY);

            let angle = 0;
            if (arah === 'KANAN') angle = 0;
            else if (arah === 'BAWAH') angle = Math.PI / 2;
            else if (arah === 'KIRI') angle = Math.PI;
            else if (arah === 'ATAS') angle = -Math.PI / 2;

            ctx.rotate(angle);

            let headR = grid * 0.52;

            if (mauMakan) {
                let mouthAngle = 0.35 * Math.PI; 

                ctx.beginPath();
                ctx.arc(0, 0, headR + 1, mouthAngle, Math.PI * 2 - mouthAngle);
                ctx.lineTo(headR * 0.2, 0);
                ctx.closePath();
                ctx.fillStyle = '#000000';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR, mouthAngle, Math.PI * 2 - mouthAngle);
                ctx.lineTo(headR * 0.3, 0);
                ctx.closePath();
                ctx.fillStyle = '#7ec850';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR * 0.85, mouthAngle * 0.9, Math.PI * 2 - (mouthAngle * 0.9));
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fillStyle = '#e63946';
                ctx.fill();

                ctx.beginPath();
                ctx.moveTo(headR * 0.2, 0);
                ctx.lineTo(headR * 1.3, 0);
                ctx.lineTo(headR * 1.5, -headR * 0.25);
                ctx.moveTo(headR * 1.3, 0);
                ctx.lineTo(headR * 1.5, headR * 0.25);
                ctx.strokeStyle = '#ff0055';
                ctx.lineWidth = 1.2;
                ctx.stroke();

            } else {
                ctx.beginPath();
                ctx.arc(0, 0, headR + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#000000';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(0, 0, headR, 0, Math.PI * 2);
                ctx.fillStyle = '#7ec850';
                ctx.fill();
            }

            let eyeOffsetY = headR * 0.42;
            let eyeOffsetX = headR * 0.22;
            let eyeR = headR * 0.32;
            let pupilR = eyeR * 0.5;

            ctx.beginPath();
            ctx.arc(eyeOffsetX, -eyeOffsetY, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eyeOffsetX + (mauMakan ? 1.5 : 0.5), -eyeOffsetY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(eyeOffsetX, eyeOffsetY, eyeR, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 0.8;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(eyeOffsetX + (mauMakan ? 1.5 : 0.5), eyeOffsetY, pupilR, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();

            ctx.restore();

            main();
        }, kecepatan);
    }

    window.addEventListener('resize', function() {
        sesuaikanUkuran();
    });

    window.onload = init;
})();
          
          
