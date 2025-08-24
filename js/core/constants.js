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
    "Rating": "",
    "Sender Account Name": "",
    "Sender Account Number": "",
    "Sender Mobile": "",
    "Beneficiary Account Number": "",
    "Beneficiary IFSC": "",
    "Beneficiary Account Name": "",
    "Beneficiary Bank": "",
    "Beneficiary Branch": "",
    "Fund TRF Purpose": "",
};

const presets = {
    "NEFT/RTGS Approval - RO": [
        "NEFT RTGS Approval Letter to RO",
        "NEFT RTGS UTR CASH Letter to Other Bank",
    ],
    "Operation": [
        "Form - Mobile Number Updation",
        "Form - Name Updation",
        "Form - Inoperative to Operative",
        "Form - Signature Card",
        "Form - Nomination DA3",
        "Form - Multipurpose",
    ],
    "CKCC Renewal": [
        "Agreement for Hypothecation of Crop",
        "CKCC Legal Set"
    ],
    "Current Account from RO": [
        "CURRENT ACCOUNT - ADDRESS INSPECTION DDR NON-PERSONAL CUSTOMER",
        "CURRENT ACCOUNT - RO Recommendation",
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
        "Rating - CC Proprietorship",
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

const fieldGroups = {
    "Basic Information": [
        "Place", "Date", "DATE", "Day", "Month", "Year", "YY - Last 2 digits of Year", "Branch", "Region", "Zone", "State"
    ],
    "Financials": [
        "Rs", "Rs. - Amount Transferred to Dealer", "Rupees", "ROI", "Facility", "Margin", "1st EMI Month", "Purpose of Advance", "Scheme", "Purpose", "Networth", "Expected Credits in a year"
    ],
    "Borrower & Personal Details": [
        "M/s", "Proprietor", "Borrower", "Old Name", "Name", "Name Field 1", "Name Field 2", "Father Name", "Mobile No", "Old Mobile Number", "Mobile Number", "Mob", "email", "PAN", "AADHAR", "ID", "Co-Borrower-1", "Co-Borrower-2", "Co-Borrower-3"
    ],
    "Business & Partnership Details": [
        "Partner 1", "Partner 2", "Partner 3", "Partner 4", "Business Activity", "Business Description", "Business Nature", "Annual Income", "Sales", "Rating", "CIN", "Year of Establishment", "Dealing with us since", "Firm ID", "Product"
    ],
    "Account Details": [
        "CIF", "CC LOAN Ac No", "Account No", "Account Number", "Saving Ac No", "Saving A/c No", "Account Type", "Udyam", "Nominee A/c No", "Deceased A/c No", "Receipt No", "Receipt Current Value"
    ],
    "Address Details": [
        "Address", "Borrower Address", "Supplier Address", "Nominee Address", "Office Address", "Business Address", "Village", "Tehsil", "District"
    ],
    "Nominee & Deceased Details": [
        "Nominee", "Relation", "Deceased", "Date of Demise", "Death Certificate issued by", "Pension Received Posthumous", "Nominee Name", "Nominee Relation", "Nominee Age", "Nominee Date of Birth"
    ],
    "Property & Security Details": [
        "Propery Area", "Property Address", "Property Owner", "Property Document Required for Mortgage - 1", "Property Document Required for Mortgage - 2", "Property Document Required for Mortgage - 3", "Property Document Required for Mortgage - 4", "Property Document Required for Mortgage - 5", "Property Document Required for Mortgage - 6", "Property Document Required for Mortgage - 7", "Security ID", "Policy No", "Policy Valid From", "Policy Valid To", "Asset ID"
    ],
    "Supplier & Quotation Details": [
        "Supplier", "Quotation No", "Quotation Date"
    ],
    "Sanction & Documentation": [
        "Sanction Date", "Sanction Letter No", "Application Date", "Last Documentation Date"
    ],
    "Fund Transfer (NEFT/RTGS)": [
        "Sender Account Name", "Sender Account Number", "Sender Mobile", "Beneficiary Account Number", "Beneficiary IFSC", "Beneficiary Account Name", "Beneficiary Bank", "Beneficiary Branch", "Fund TRF Purpose", "UTR"
    ],
    "Internal & Officer Details": [
        "Staff Name", "Staff PF", "Processing Officer", "Sanctioning Officer", "INSPECTING OFFICIAL", "Inspecting Officer", "PF of Inspecting Officer", "Branch Manager", "Advocate Name", "Officer Name", "Officer Designation", "MAKER", "CHECKER Name", "CHECKER PF", "CHECKER Designation"
    ],
    "Other Details": [
        "Multipurpose Request 1", "Multipurpose Request 2"
    ]
};

const accountDetails = {
    "<--Select-->": {
        "Sender Account Name": "",
        "Sender Account Number": "",
        "Sender Mobile": "",
        "Beneficiary Account Number": "",
        "Beneficiary IFSC": "",
        "Beneficiary Account Name": "",
        "Beneficiary Bank": "",
        "Beneficiary Branch": "",
        "Fund TRF Purpose": "",
    },
    "BOB Mangalwar": {
        "Sender Account Name": "SUNDRY DEBTORS",
        "Sender Account Number": "50810028988",
        "Sender Mobile": "8696930799",
        "Beneficiary Account Number": "13270013201006",
        "Beneficiary IFSC": "BARB0MANCHI",
        "Beneficiary Account Name": "Sundry deposit rtgs OUTWARD",
        "Beneficiary Bank": "Bank of Baroda",
        "Beneficiary Branch": "Mangalwar",
        "Fund TRF Purpose": "Cash Remittance"
    },
    "YES Bank Bhinder": {
        "Sender Account Name": "SUNDRY DEBTORS",
        "Sender Account Number": "50810028988",
        "Sender Mobile": "8696930799",
        "Beneficiary Account Number": "189800000104",
        "Beneficiary IFSC": "YESB0000771",
        "Beneficiary Account Name": "CENTRAL BANK OF INDIA",
        "Beneficiary Bank": "Yes Bank",
        "Beneficiary Branch": "Bhinder",
        "Fund TRF Purpose": "Cash Remittance"
    },
    "AU Bank Bhinder": {
        "Sender Account Name": "SUNDRY DEBTORS",
        "Sender Account Number": "50810028988",
        "Sender Mobile": "8696930799",
        "Beneficiary Account Number": "2221203542441944",
        "Beneficiary IFSC": "AUBL0002238",
        "Beneficiary Account Name": "AUSBF ADHOC CASH ARRANGEMENT",
        "Beneficiary Bank": "AU Small Finance Bank",
        "Beneficiary Branch": "Bhinder",
        "Fund TRF Purpose": "Cash Remittance"
    },
    "BHARAT IT Vendor Payment": {
        "Sender Account Name": "Internal CD",
        "Sender Account Number": "3652995843",
        "Sender Mobile": "8696930799",
        "Beneficiary Account Number": "9BITMC0054JAIPUR",
        "Beneficiary IFSC": "DBSS0IN0811",
        "Beneficiary Account Name": "BHARAT IT SERVICES LTD",
        "Beneficiary Bank": "DBS BANK LTD",
        "Beneficiary Branch": "Mumbai",
        "Fund TRF Purpose": "Vendor Bill Payment"
    }
};