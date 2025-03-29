// utils.js
function convertToWords(price) {
    var sglDigit = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"],
        dblDigit = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"],
        tensPlace = ["", "Ten", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"],
        handle_tens = function (dgt, prevDgt) {
            return 0 == dgt ? "" : " " + (1 == dgt ? dblDigit[prevDgt] : tensPlace[dgt]);
        },
        handle_utlc = function (dgt, nxtDgt, denom) {
            return (0 != dgt && 1 != nxtDgt ? " " + sglDigit[dgt] : "") + (0 != nxtDgt || dgt > 0 ? " " + denom : "");
        };

    var str = "",
        digitIdx = 0,
        digit = 0,
        nxtDigit = 0,
        words = [];

    // Edge case: Handle empty or invalid input
    if (price === "" || isNaN(parseInt(price))) {
        return "Rupees Zero Only";
    }

    // Edge case: Handle zero
    if (parseInt(price) === 0) {
        return "Rupees Zero Only";
    }

    // Edge case: Handle negative numbers
    if (parseInt(price) < 0) {
        return "Rupees Zero Only"; // Or handle negative values as needed
    }

    // Edge case: Handle numbers with decimal points
    if (price.includes(".")) {
        const [wholePart, decimalPart] = price.split(".");
        const wholeWords = convertToWords(wholePart);
        const decimalWords = convertToWords(decimalPart);
        return ` ${wholeWords.trim()} and ${decimalWords.trim()} Paise `;
    }

    // Handle numbers up to 10 digits
    if (parseInt(price) > 0 && price.length <= 10) {
        for (digitIdx = price.length - 1; digitIdx >= 0; digitIdx--) {
            digit = price[digitIdx] - 0;
            nxtDigit = digitIdx > 0 ? price[digitIdx - 1] - 0 : 0;

            switch (price.length - digitIdx - 1) {
                case 0:
                    words.push(handle_utlc(digit, nxtDigit, ""));
                    break;
                case 1:
                    words.push(handle_tens(digit, price[digitIdx + 1]));
                    break;
                case 2:
                    words.push(0 != digit ? " " + sglDigit[digit] + " Hundred" + (0 != price[digitIdx + 1] && 0 != price[digitIdx + 2] ? " and" : "") : "");
                    break;
                case 3:
                    words.push(handle_utlc(digit, nxtDigit, "Thousand"));
                    break;
                case 4:
                    words.push(handle_tens(digit, price[digitIdx + 1]));
                    break;
                case 5:
                    words.push(handle_utlc(digit, nxtDigit, "Lakh"));
                    break;
                case 6:
                    words.push(handle_tens(digit, price[digitIdx + 1]));
                    break;
                case 7:
                    words.push(handle_utlc(digit, nxtDigit, "Crore"));
                    break;
                case 8:
                    words.push(handle_tens(digit, price[digitIdx + 1]));
                    break;
                case 9:
                    words.push(0 != digit ? " " + sglDigit[digit] + " Hundred" + (0 != price[digitIdx + 1] || 0 != price[digitIdx + 2] ? " and" : " Crore") : "");
                    break;
            }
        }
        str = words.reverse().join("");
    } else {
        str = ""; // Handle numbers longer than 10 digits
    }

    // Add "Rupees" as prefix and "Only" as suffix for whole numbers
    return `Rupees ${str.trim()} Only`;
}

function showToast(message, type = 'info', duration = 5000) {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        console.error("Toast container not found!");
        return;
    }

    // Create a new toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // Add the toast to the container
    toastContainer.appendChild(toast);

    // Force a reflow to trigger the slide-in animation
    toast.getBoundingClientRect();

    // Start the slide-in animation
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';

    // Automatically remove the toast after the specified duration
    setTimeout(() => {
        toast.style.opacity = '0'; // Start fade-out animation
        setTimeout(() => {
            toast.remove(); // Remove the toast from the DOM after animation
        }, 500); // Match the fadeOut animation duration
    }, duration);
}

function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}