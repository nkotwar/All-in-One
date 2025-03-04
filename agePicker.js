// AgePicker.js

class AgePicker {
    constructor(element, ages, size = { x: 400, y: 400 }) {
        this._element = element;
        this._ages = ages;
        this._size = size;
        this._center = { x: this._size.x * 0.5, y: this._size.y * 0.5 };
        this._2PI = Math.PI * 2;

        // Settings
        this._hoverLengthIncrease = 0.1;
        this._tweenSpeed = 0.5;
        this._tweenEase = Power3.easeOut;

        // Selected/mouse-over segments
        this._mouseOverSegmentIndex = -1;
        this._selectedSegmentIndex = -1;
        this._selectedAge = 15; // Default selected age is 15

        // Initialize canvas and data
        this.createCanvas();
        this.initAgeData(ages);

        // Update segment data
        this.updateSegmentsDrawData();

        // Event listeners
        this._canvas.addEventListener('mousemove', (event) => {
            this.updateSegmentIndexOnMouseEvent(event);
        });

        this._canvas.addEventListener('click', (event) => {
            this.updateSegmentIndexOnMouseEvent(event);
        });

        // Start drawing loop
        this.draw();
    }

    createCanvas() {
        this._canvas = document.createElement('canvas');
        this._canvas.width = this._size.x;
        this._canvas.height = this._size.y;
        this._context = this._canvas.getContext('2d');
        this._element.appendChild(this._canvas);
    }

    initAgeData(ages) {
        let segments = [];
        const colors = ['#0D0C19', '#335464', '#D6EDD9', '#F0FFFF', '#FF5732', '#0D0C19', '#335464', '#D6EDD9', '#F0FFFF', '#FF5732'];

        for (let i = 0; i < ages.length; i++) {
            let arcLength = 1 / ages.length;
            segments.push({
                length: arcLength,
                animatingLength: arcLength,
                color: colors[i % colors.length],
                age: ages[i]
            });
        }

        this._circleData = {
            rotationRadians: 0,
            innerRadius: 60,
            outerRadius: 200,
            segments: segments
        };
    }

    updateSegmentsDrawData() {
        let total = 0;
        let noMouseOverTotal = 0;

        this._circleData.segments.forEach((segment, index) => {
            if (!segment) {
                console.error("Segment is undefined at index:", index);
                return;
            }

            segment.length = this.getArcLengthBySegmentIndex(index);
            segment.start = total;
            segment.noMouseOverStart = noMouseOverTotal;
            segment.noMouseOverLength = this.getArcLengthBySegmentIndex(index, true);

            if (typeof TweenLite !== "undefined" && segment) {
                TweenLite.killTweensOf(segment);
                TweenLite.to(segment, this._tweenSpeed, { animatingLength: segment.length, ease: this._tweenEase });
            }

            total += segment.length;
            noMouseOverTotal += segment.noMouseOverLength;
        });

        let rotation = 0;
        if (this._mouseOverSegmentIndex > -1) {
            let mouseOverSegment = this._circleData.segments[this._mouseOverSegmentIndex];
            if (this._selectedSegmentIndex > -1) {
                rotation = this._selectedSegmentIndex === this._mouseOverSegmentIndex
                    ? 0.5 - this._hoverLengthIncrease * 0.5 - mouseOverSegment.start
                    : 0.5 - this._circleData.segments[this._selectedSegmentIndex].start;
            } else {
                rotation = mouseOverSegment.noMouseOverStart - this._hoverLengthIncrease * 0.5 - mouseOverSegment.start;
            }
        } else if (this._selectedSegmentIndex > -1) {
            rotation = 0.5 - this._circleData.segments[this._selectedSegmentIndex].start;
        }

        if (typeof TweenLite !== "undefined" && this._circleData) {
            TweenLite.killTweensOf(this._circleData);
            TweenLite.to(this._circleData, this._tweenSpeed, { rotationRadians: rotation * this._2PI, ease: this._tweenEase });
        }
    }

    updateSegmentIndexOnMouseEvent(event) {
        let segmentIndex = this.getSegmentIndexOnPosition(this.getMousePositionInCanvas(event));
        let propertyNameToCompare = event.type === 'click' ? '_selectedSegmentIndex' : '_mouseOverSegmentIndex';
    
        if (this[propertyNameToCompare] !== segmentIndex) {
            this[propertyNameToCompare] = segmentIndex;
    
            // Update selected age based on segment index and initial age
            if (event.type === 'click' && segmentIndex !== -1) {
                const initialAge = parseInt(document.getElementById("initial-age").value, 10);
                this._selectedAge = initialAge + segmentIndex; // Absolute age = initial age + segment index
                document.getElementById('selected-age').textContent = this._selectedAge;
                console.log(`Selected Age: ${this._selectedAge}`);
            }
    
            this.updateSegmentsDrawData();
        }
    }

    getSegmentIndexOnPosition(position) {
        let distanceToCenter = this.getDistanceToCenter(position);
        if (distanceToCenter >= this._circleData.innerRadius && distanceToCenter <= this._circleData.outerRadius) {
            let deltaX = position.x - this._center.x;
            let deltaY = position.y - this._center.y;
            let radians = Math.atan2(deltaY, deltaX) - this._circleData.rotationRadians;
            let adjustedMouseRadians = radians >= 0 ? radians : this._2PI + radians;

            let startRadians = 0;
            let totalLengthInRadians = 0;
            for (let i = 0; i < this._circleData.segments.length; i++) {
                totalLengthInRadians += this._circleData.segments[i].length * this._2PI;
                if (startRadians + totalLengthInRadians > adjustedMouseRadians) {
                    return i;
                }
            }
        }
        return -1;
    }

    getDistanceToCenter(position) {
        let a = position.x - this._center.x;
        let b = position.y - this._center.y;
        return Math.sqrt(a * a + b * b);
    }

    getMousePositionInCanvas(mouseEvent) {
        let rect = this._canvas.getBoundingClientRect();
        return {
            x: mouseEvent.clientX - rect.left,
            y: mouseEvent.clientY - rect.top
        };
    }

    draw() {
        this._context.clearRect(0, 0, this._size.x, this._size.y);
    
        let startRadians = this._circleData.rotationRadians;
        let outerRadius = this._circleData.outerRadius;
        let innerRadius = this._circleData.innerRadius;
    
        // Draw segments
        this._circleData.segments.forEach((segment, index) => {
            let endRadians = startRadians + segment.animatingLength * this._2PI;
    
            this._context.beginPath();
            this._context.arc(this._center.x, this._center.y, innerRadius, startRadians, endRadians);
            this._context.lineTo(this._center.x + outerRadius * Math.cos(endRadians), this._center.y + outerRadius * Math.sin(endRadians));
            this._context.arc(this._center.x, this._center.y, outerRadius, endRadians, startRadians, true);
            this._context.lineTo(this._center.x + innerRadius * Math.cos(startRadians), this._center.y + innerRadius * Math.sin(startRadians));
            this._context.closePath();
    
            this._context.fillStyle = segment.color;
            this._context.fill();
            this._context.lineWidth = 1;
            this._context.strokeStyle = segment.color;
            this._context.stroke();
    
            // Draw age text in the center of each segment
            let midRadians = startRadians + (segment.animatingLength * this._2PI) / 2;
            let textRadius = (innerRadius + outerRadius) / 2;
            let textX = this._center.x + textRadius * Math.cos(midRadians);
            let textY = this._center.y + textRadius * Math.sin(midRadians);
    
            this._context.fillStyle = '#fff';
            this._context.font = '16px Arial';
            this._context.textAlign = 'center';
            this._context.textBaseline = 'middle';
            this._context.fillText(segment.age, textX, textY);
    
            startRadians = endRadians;
        });
    
        // Draw selected age in the center circle
        this._context.fillStyle = '#000'; // Black color for selected age
        this._context.font = '24px Arial'; // Larger font for selected age
        this._context.textAlign = 'center';
        this._context.textBaseline = 'middle';
        this._context.fillText(this._selectedAge, this._center.x, this._center.y);
    
        requestAnimationFrame(() => this.draw());
    }

    getArcLengthBySegmentIndex(index, forceNoHover) {
        let numberOfSegments = this._circleData.segments.length;
        let mouseOverSegmentIndex = forceNoHover ? -1 : this._mouseOverSegmentIndex;

        if (this._selectedSegmentIndex > -1) {
            let notHoveredSelectedArcLength = 0.5;
            let notHoveredNotSelectedArcLength = (1 - notHoveredSelectedArcLength) / (numberOfSegments - 1);

            if (mouseOverSegmentIndex > -1) {
                if (this._selectedSegmentIndex === mouseOverSegmentIndex) {
                    return index === mouseOverSegmentIndex
                        ? notHoveredSelectedArcLength + this._hoverLengthIncrease
                        : (1 - (notHoveredSelectedArcLength + this._hoverLengthIncrease)) / (numberOfSegments - 1);
                } else {
                    if (index === this._selectedSegmentIndex) {
                        return notHoveredSelectedArcLength;
                    } else if (index === mouseOverSegmentIndex) {
                        return (1 - notHoveredSelectedArcLength) / (numberOfSegments - 1) + this._hoverLengthIncrease;
                    } else {
                        return (1 - notHoveredSelectedArcLength - this._hoverLengthIncrease) / (numberOfSegments - 2);
                    }
                }
            } else {
                return index === this._selectedSegmentIndex ? notHoveredSelectedArcLength : notHoveredNotSelectedArcLength;
            }
        } else {
            let notHoveredArcLength = 1 / numberOfSegments;
            if (mouseOverSegmentIndex > -1) {
                return index === mouseOverSegmentIndex
                    ? notHoveredArcLength + this._hoverLengthIncrease
                    : (1 - (notHoveredArcLength + this._hoverLengthIncrease)) / (numberOfSegments - 1);
            } else {
                return notHoveredArcLength;
            }
        }
    }
}