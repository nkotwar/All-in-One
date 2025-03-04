// constants.js
const TEMP_PDF_NAME = "temp"; // Name of the temporary PDF to ignore

const today = new Date();
const day = String(today.getDate()).padStart(2, '0'); // Ensure two digits
const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based
const year = today.getFullYear();

const formattedDate = `${day}/${month}/${year}`;

const defaultFieldValues = {
    "Branch": "Heenta",
    "Place": "Heenta",
    "Day": new Date().getDate().toString(), // Today's day
    "Month": new Date().toLocaleString('default', { month: 'long' }), // Current month
    "Year": new Date().getFullYear().toString(), // Current year
    "District": "Udaipur",
    "Tehsil": "Bhinder",
    "State": "Rajasthan",
    "Date": formattedDate, // Today's date
    "Last Documentation Date": formattedDate, // Today's date
    "YY - Last 2 digits of Year": new Date().getFullYear().toString().slice(-2), // Last 2 digits of the year
    "Region": "Jodhpur",
    "Zone": "Delhi",
    "Purpose of Advance": "Agricultural",
    "Rs": "",
    "Rupees": "",
    "ROI": "",
    "Facility": "",
    "Margin": "",
    "1st EMI Month": "",
    "Purpose of Advance": "Agricultural",
    "Scheme": "",
    "Purpose": "",
    "Borrower": "",
    "Name": "",
    "Name Field 1": "",
    "Name Field 2": "",
    "Mobile No": "",
    "PAN": "",
    "AADHAR": "",
    "Co-Borrower-1": "",
    "Co-Borrower-2": "",
    "Co-Borrower-3": "",
    "CC LOAN Ac No": "",
    "Account No": "",
    "Saving Ac No": "",
    "Saving A/c No": "",
    "Nominee A/c No": "",
    "Deceased A/c No": "",
    "Receipt No": "",
    "Receipt Current Value": "",
    "UTR": "",
    "Address": "",
    "Supplier Address": "",
    "Nominee Address": "",
    "Office Address": "",
    "Village": "Heenta",
    "District": "Udaipur",
    "Nominee": "",
    "Relation": "",
    "Deceased": "",
    "Date of Demise": "",
    "Death Certificate issued by": "",
    "Pension Received Posthumous": "",
    "M/s": "",
    "Supplier": "",
    "Quotation No": "",
    "Quotation Date": "",
    "INSPECTING OFFICIAL": "",
    "Branch Manager": "",
    "Sanction Date": "",
    "Sanction Letter No": "",
    "Application Date": "",
    "Last Documentation Date": "",
    "Sales": "",
    "Rating": ""
};

const presets = {
    "CKCC Renewal": [
        "Agreement for Hypothecation of Crop",
        "CKCC Legal Set"
    ],
    "DL-OD AGAINST FD MMDC": [
        "DL-OD AGAINST FD MMDC",
    ],
    "Deceased Case Settlement with Nomination": [
        "Deceased Case Settlement with Nomination",
    ],
    "CC Renewal - Proprietor": [
        "Renewal Application MSME",
        "Stock Statement",
        "Renewal Recommendation - CC Proprietorship",
        "Renewal Sanction Letter - CC Proprietorship",
        "Renewal Process Note - CC Proprietorship",
        "DP NOTE SINGLE",
        "LETTER OF WAIVER",
        "LETTER OF INTEREST VARIATION",
        "LETTER OF CONTINUITY",
        "LETTER OF CONSENT BY BORROWER",
        "LETTER OF DEPOSIT OF ADVANCE CHEQUES",
        "SUPPLEMENTARY AGREEMENT",
        "LETTER OF SOLE-PROPRIETORSHIP",
        "LETTER OF AUTHORITY - CC Proprietor",
        "ACKNOLEDGEMENT OF DEBT - CC Proprietor",
        "IRAC",
        "AGREEMENT OF HYPOTHECATION TO SECURE DEMAND CASH CREDIT AGAINST GOODS - CC Proprietor",
    ],
    // Add more presets here if needed
};

const fieldOrder = [
    // Basic Information
    "Place", "Date", "DATE", "Day", "Month", "Year", "YY - Last 2 digits of Year", "Branch", "Region", "Zone", "State",

    // Loan Details
    "Rs", "Rs. - Amount Transferred to Dealer", "Rupees", "ROI", "Facility", "Margin", "1st EMI Month", "Purpose of Advance", "Scheme", "Purpose",

    // Personal Details
    "M/s", "Borrower", "Name", "Name Field 1", "Name Field 2", "Mobile No", "email", "PAN", "AADHAR", "Co-Borrower-1", "Co-Borrower-2", "Co-Borrower-3",
    // Partnership Details
    "Partner 1", "Partner 2", "Partner 3", "Partner 4",

    // Account Details
    "CIF", "CC LOAN Ac No", "Account No", "Saving Ac No", "Saving A/c No", "Udyam", "Nominee A/c No", "Deceased A/c No",
    "Receipt No", "Receipt Current Value", "UTR",

    // Address Details
    "Address", "Supplier Address", "Nominee Address", "Office Address", "Business Address", "Village", "Tehsil", "District",

    // Nominee/Deceased Details
    "Nominee", "Relation", "Deceased", "Date of Demise", "Death Certificate issued by", "Pension Received Posthumous",

    // Supplier & Quotation Details
    "Supplier", "Quotation No", "Quotation Date",

    // Inspection & Sanction Details
    "INSPECTING OFFICIAL", "Branch Manager", "Sanction Date", "Sanction Letter No", "Application Date", "Last Documentation Date",

    // Business & Sales Information
    "Sales", "Rating", "CIN", "Year of Establishment", "Dealing with us since", "Asset ID",

    // Additional Banking & Security Information
    "Security ID", "Policy No", "Policy Valid From", "Policy Valid To",

    // Officers & Processing Details
    "Processing Officer", "Sanctioning Officer"

];
