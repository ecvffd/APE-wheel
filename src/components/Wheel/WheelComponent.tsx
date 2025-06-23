import { useEffect, useRef, useState, useCallback } from 'react';
import './WheelComponent.css';
import { Text } from '@telegram-apps/telegram-ui';
import { WheelPrize } from '@/types/common';

export interface WheelComponentProps {
    prizes: WheelPrize[];
    onSpinComplete: (prize: WheelPrize) => void;
    onSpinStart: () => void;
    selectedPrizeId?: number | string; // ID of the prize to land on (determined by backend)
    outerBorderColor?: string;
    outerBorderWidth?: number;
    subOuterBorderColor?: string;
    subOuterBorderWidth?: number;
    innerBgColor?: string;
    innerBorderColor?: string;
    innerBorderWidth?: number;
    innerRadius?: number;
    textDistance?: number;
    fontSize?: number;
    imgSize?: number;
    fontFamily?: string;
    canvasWidth?: number;
    canvasHeight?: number;
    centerText?: string;
    centerTextColor?: string;
    centerTextFontSize?: number;
    onlyShowImageIfPresent?: boolean;
    disabled?: boolean;
    lineWidth?: number;
    lineColor?: string;
    sectorBgColor?: string;
    secondarySectorBgColor?: string;
    sectorTextColor?: string;
    sectorBorderWidth?: number;
}

export function WheelComponent({
    prizes,
    onSpinComplete,
    onSpinStart,
    selectedPrizeId,
    outerBorderColor = '#CC7C12',
    outerBorderWidth = 8,
    subOuterBorderColor = '#F9990F',
    subOuterBorderWidth = 8,
    innerBgColor = '#F9990F',
    innerBorderColor = '#CC7C12',
    innerBorderWidth = 8,
    innerRadius = 0.4,
    textDistance = 0.75,
    fontSize = 24,
    imgSize = 34,
    fontFamily = 'Arial, sans-serif',
    canvasWidth = 500,
    canvasHeight = 500,
    centerText = 'SPIN',
    centerTextColor = '#FFFFFF',
    centerTextFontSize = 24,
    disabled = false,
    lineWidth = 3,
    lineColor = '#d4af37',
    sectorBgColor = '#16171b',
    secondarySectorBgColor = '#242529',
    sectorTextColor = '#d6b56d',
    sectorBorderWidth = 4
}: WheelComponentProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isWaitingForResult, setIsWaitingForResult] = useState(false);
    const [currentRotation, setCurrentRotation] = useState(-90); // Start with -90 degrees to align first sector with top marker
    const animationRef = useRef<number>();
    const isDpi2x = window.devicePixelRatio > 1;
    const superSamplingFactor = isDpi2x ? 2 : 1;
    const centerRadius = Math.min(canvasWidth, canvasHeight) * innerRadius / 2;
    const centerImageRef = useRef<HTMLImageElement | null>(null);
    const prizeImagesRef = useRef<Map<string | number, HTMLImageElement>>(new Map());

    // Calculate the number of sectors and the size in radians
    const numSectors = prizes.length;
    const sectorRad = (2 * Math.PI) / numSectors;

    // Draw wheel function
    const drawWheel = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set the actual canvas dimensions with supersampling
        canvas.width = canvasWidth * superSamplingFactor;
        canvas.height = canvasHeight * superSamplingFactor;

        // Set display size
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        // Scale everything by superSamplingFactor
        ctx.scale(superSamplingFactor, superSamplingFactor);

        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Set constants
        const centerX = canvasWidth / 2;
        const centerY = canvasHeight / 2;
        const radius = Math.min(centerX, centerY) - outerBorderWidth / 2 - subOuterBorderWidth / 2;

        // Draw outer border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + outerBorderWidth, 0, 2 * Math.PI);
        ctx.lineWidth = outerBorderWidth;
        ctx.strokeStyle = outerBorderColor;
        ctx.stroke();

        // Draw sub outer border
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.lineWidth = subOuterBorderWidth;
        ctx.strokeStyle = subOuterBorderColor;
        ctx.stroke();

        // Draw the sectors
        prizes.forEach((prize, index) => {
            // Calculate angles for this sector
            const startAngle = index * sectorRad;
            const endAngle = (index + 1) * sectorRad;
            const midAngle = startAngle + sectorRad / 2;

            // Draw sector with inset border
            // First, create and fill the sector
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius - outerBorderWidth, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = prize.backgroundColor || (index % 2 ? sectorBgColor : secondarySectorBgColor);
            ctx.fill();

            // Now create inset stroke using clip
            if (sectorBorderWidth > 0) {
                // Save the context to restore later
                ctx.save();

                // Create a clipping region of the exact sector shape
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius - outerBorderWidth + sectorBorderWidth, startAngle, endAngle);
                ctx.closePath();
                ctx.clip();

                // Draw a slightly larger stroke that will be clipped to the inside
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius - outerBorderWidth + sectorBorderWidth, startAngle, endAngle);
                ctx.closePath();
                ctx.lineWidth = sectorBorderWidth * 2; // Double width as half will be clipped
                ctx.strokeStyle = prize.borderColor || (index % 2 ? '#ff0000' : '#00ff00');
                ctx.stroke();

                // Restore the context to remove clipping
                ctx.restore();
            }

            // Prize image
            const prizeImage = prizeImagesRef.current.get(prize.id);
            const isImagePresent = !!(prize.imageUrl && prizeImage);

            // Calculate text/image position
            const imageX = centerX + Math.cos(midAngle) * (radius * textDistance);
            const imageY = centerY + Math.sin(midAngle) * (radius * textDistance);

            // Draw prize image if available
            if (prize.imageUrl && prizeImage) {
                try {
                    ctx.save();
                    // Rotate text to be upright regardless of wheel position
                    ctx.translate(imageX, imageY);
                    ctx.rotate(midAngle + Math.PI / 2);
                    ctx.drawImage(
                        prizeImage,
                        -(prize.imageWidth || imgSize) / 2,
                        -(prize.imageHeight || imgSize) / 2,
                        prize.imageWidth || imgSize,
                        prize.imageHeight || imgSize
                    );
                    ctx.restore();
                } catch (e) {
                    console.error(`Error drawing prize image for ${prize.id}:`, e);
                }
            }

            const textX = centerX + Math.cos(midAngle) * (radius * textDistance - (isImagePresent ? imgSize * 0.8 : 0));
            const textY = centerY + Math.sin(midAngle) * (radius * textDistance - (isImagePresent ? imgSize * 0.8 : 0));

            // Draw prize text
            if (prize.text) {
                ctx.save();
                // Rotate text to be upright regardless of wheel position
                ctx.translate(textX, textY);
                ctx.rotate(midAngle + Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = `bold ${fontSize}px ${fontFamily}`;
                ctx.fillStyle = prize.textColor || sectorTextColor;
                const words = prize.text.split(' ');
                words.forEach((word, index) => {
                    ctx.fillText(word, 0, index * fontSize * 1.2);
                });
                ctx.restore();
            }
        });

    }, [
        canvasHeight,
        canvasWidth,
        centerRadius,
        centerText,
        centerTextColor,
        centerTextFontSize,
        fontFamily,
        fontSize,
        innerBgColor,
        innerBorderColor,
        innerBorderWidth,
        innerRadius,
        lineColor,
        lineWidth,
        outerBorderColor,
        outerBorderWidth,
        prizes,
        sectorRad,
        superSamplingFactor,
        textDistance,
    ]);

    const spinWheel = () => {
        if (disabled || isSpinning) return;
        
        setIsSpinning(true);
        setIsWaitingForResult(true);
        onSpinStart();
        
        // Start continuous spinning using requestAnimationFrame
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Clear any existing transition
        canvas.style.transition = 'none';
        
        let startTime = Date.now();
        let startRotation = currentRotation;
        
        const animate = () => {
            if (!isWaitingForResult) return; // Stop if we have a result
            
            const elapsed = Date.now() - startTime;
            const rotationSpeed = 360; // degrees per second
            const currentRotationValue = startRotation + (elapsed / 1000) * rotationSpeed;
            
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.style.transform = `rotate(${currentRotationValue}deg)`;
            }
            
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
    };

    // Effect to handle when selectedPrizeId is provided
    useEffect(() => {
        if (isSpinning && isWaitingForResult && selectedPrizeId !== undefined) {
            setIsWaitingForResult(false);
            
            // Cancel the continuous animation
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
            
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Find the prize index
            const prizeIndex = prizes.findIndex(prize => prize.id === selectedPrizeId);
            if (prizeIndex === -1) {
                console.error('Prize not found:', selectedPrizeId);
                setIsSpinning(false);
                return;
            }

            // Debug: Let's understand the current wheel state
            const sectorAngle = 360 / numSectors;
            
            // Get current rotation from the canvas transform
            const currentTransform = canvas.style.transform;
            const currentDeg = currentTransform ? 
                parseFloat(currentTransform.match(/rotate\(([^)]+)deg\)/)?.[1] || '0') : 0;
            
            // The wheel starts with currentRotation = -90 degrees
            // This means sector 0 is at the top when the wheel is at -90 degrees
            // Each sector spans from (index * sectorAngle) to ((index + 1) * sectorAngle)
            
            // Calculate a random position within the selected sector
            const sectorStartAngle = prizeIndex * sectorAngle;
            const randomWithinSector = Math.random() * sectorAngle; // Random position within the sector
            const sectorRandomOffset = sectorStartAngle + randomWithinSector;
            
            // Calculate where we want to end up (random position within the selected sector at the top)
            const targetRotation = -90 - sectorRandomOffset;
            
            // Calculate how much we need to rotate from current position
            let rotationNeeded = targetRotation - currentDeg;
            
            // Always rotate forward (positive direction)
            while (rotationNeeded <= 0) {
                rotationNeeded += 360;
            }
            
            // Add extra spins for dramatic effect
            const extraSpins = 1800; // 5 full rotations
            const totalRotation = rotationNeeded + extraSpins;
            
            // Final position
            const finalDegWithOffset = currentDeg + totalRotation;

            // Apply smooth deceleration
            canvas.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)';
            canvas.style.transform = `rotate(${finalDegWithOffset}deg)`;

            // Handle spin completion
            const handleTransitionEnd = () => {
                canvas.style.transition = 'none';
                
                // Normalize rotation to 0-360 range for next spin
                let normalizedDeg = finalDegWithOffset % 360;
                if (normalizedDeg < 0) {
                    normalizedDeg += 360;
                }
                
                canvas.style.transform = `rotate(${normalizedDeg}deg)`;
                setCurrentRotation(normalizedDeg);
                
                setIsSpinning(false);
                
                // Find and return the winning prize
                const winningPrize = prizes.find(prize => prize.id === selectedPrizeId);
                if (winningPrize) {
                    onSpinComplete(winningPrize);
                }
                
                canvas.removeEventListener('transitionend', handleTransitionEnd);
            };

            canvas.addEventListener('transitionend', handleTransitionEnd);
        }
    }, [isSpinning, isWaitingForResult, selectedPrizeId, prizes, numSectors, onSpinComplete, currentRotation]);

    // Cleanup function
    const stopSpinning = useCallback(() => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setIsSpinning(false);
        setIsWaitingForResult(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopSpinning();
        };
    }, [stopSpinning]);

    // Load images
    useEffect(() => {
        // Load prize images
        prizes.forEach(prize => {
            if (prize.imageUrl) {
                const img = new Image();
                img.onload = () => {
                    prizeImagesRef.current.set(prize.id, img);
                    drawWheel();
                };
                img.onerror = (e) => {
                    console.error(`Failed to load prize image for ${prize.id}:`, e);
                };
                img.src = prize.imageUrl;
            }
        });

        return () => {
            // Cleanup
            centerImageRef.current = null;
            prizeImagesRef.current.clear();
        };
    }, [drawWheel, prizes]);

    // Initial render
    useEffect(() => {
        drawWheel();
        // Set initial rotation to align first sector with top marker
        if (canvasRef.current && !isSpinning) {
            canvasRef.current.style.transform = `rotate(${currentRotation}deg)`;
        }
    }, [drawWheel, currentRotation, isSpinning]);

    return (
        <div className="wheel-component">
            <div className={`wheel-inner-circle ${disabled ? 'disabled' : ''}`} onClick={spinWheel}>
                <Text weight="1" style={{ textAlign: 'center', fontSize: centerTextFontSize, color: centerTextColor }}>{centerText}</Text>
            </div>
            <div
                ref={containerRef}
                className="wheel-component-container"
                onClick={spinWheel}
            >
                <canvas
                    ref={canvasRef}
                    style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
                    className={`wheel-canvas ${disabled ? 'disabled' : ''}`}
                />
            </div>
        </div>
    );
} 