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
    "ID": "OVD",
    "MAKER": "131246",
    "Staff Name": "Devendra Kumar Chaturvedi",
    "Staff PF": "078940",
    "Processing Officer":"Nitin Kotwar-139535",
    "Sanctioning Officer": "Harmana Ram - 125245",
    "Branch Manager": "Harmana Ram - 125245",
    "INSPECTING OFFICIAL":"Nitin Kotwar-139535",
    "Inspecting Official":"Nitin Kotwar-139535",
    "Inspecting Officer":"Nitin Kotwar-139535",
    "PF of Inspecting Officer":"139535",
    "PF":"139535",
    "MAKER": "131246",
    "CHECKER Name":"Nitin Kotwar",
    "CHECKER PF": "139535",
    "CHECKER Designation": "AM",
    "Landlord PAN": "ALJPB1062B",
    "Branch(State) GST": "08AAACC2498P4Z0",
    "Branch Address": "Vill PO Heenta, Bhinder, Udaipur, Raj. - 313603",
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
    "Messrs": "",
    "Supplier": "",
    "Quotation No": "",
    "Quotation Date": "",
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
    "Net Worth": "400000",
    "Vehicle No.": "NA",
    "Turnover": "200000",
    "Vehicle No.": "NA",
    "Occupation": "NA",
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
        "Place",
        "Date",
        "Day",
        "Month",
        "Year",
        "YY - Last 2 digits of Year",
        "Branch",
        "Branch Address",
        "Branch(State) GST",
        "Region",
        "Zone",
        "State"
    ],
    "Customer & Personal Details": [
        "M/s",
        "Messrs",
        "Borrower",
        "Name",
        "Name Field 1",
        "Name Field 2",
        "Old Name",
        "Father Name",
        "DOB",
        "Age",
        "Mobile No",
        "Mobile Number",
        "Old Mobile Number",
        "email",
        "PAN",
        "AADHAR",
        "ID",
        "Co-Borrower-1",
        "Co-Borrower-2",
        "Co-Borrower-3"
    ],
    "Asset & Liability Details": [
        "AssetCashBankBalance",
        "AssetGold",
        "AssetCapitalinBusiness",
        "AssetVehicle",
        "AssetImmovable",
        "AssetMovable",
        "AssetTotal",
        "Liablities"
    ],
    "Business & Partnership Details": [
        "Business Nature",
        "Business Description",
        "Business Activity",
        "Year of Establishment",
        "Date of Establishment",
        "Dealing with us since",
        "Annual Income",
        "Sales",
        "Rating",
        "Udyam"
    ],
    "Address Details": [
        "Address",
        "Office Address",
        "Business Address",
        "Supplier Address",
        "Nominee Address",
        "Village",
        "Tehsil",
        "District"
    ],
    "Financials": [
        "Rs",
        "Rs. - Amount Transferred to Dealer",
        "Amount",
        "Rupees",
        "ROI",
        "Facility",
        "Margin",
        "NetWorth",
        "Loan Account Number",
        "Loan Sanctioned Amount",
        "Disbursement Amount",
        "Mode of Disbursement",
        "EMI",
        "1st EMI Month",
        "EMI Day",
        "Invoice Number",
        "Purpose of Advance",
        "Scheme",
        "Purpose"
    ],
    "Account Details": [
        "CIF",
        "Account No",
        "Account Number",
        "CC LOAN Ac No",
        "Saving Ac No",
        "Saving A/c No",
        "Nominee A/c No",
        "Deceased A/c No",
        "Receipt No",
        "Receipt Current Value"
    ],
    "Nominee & Deceased Details": [
        "Nominee",
        "Relation",
        "Deceased",
        "Date of Demise",
        "Death Certificate issued by",
        "Pension Received Posthumous"
    ],
    "Property & Security Details": [
        "Security ID",
        "Policy No",
        "Policy Valid From",
        "Policy Valid To",
        "Asset ID"
    ],
    "Supplier & Quotation Details": [
        "Supplier",
        "Quotation No",
        "Quotation Date"
    ],
    "Sanction & Documentation": [
        "Application Date",
        "Sanction Date",
        "Sanction Letter No",
        "Documentation Date",
        "Last Documentation Date"
    ],
    "Landlord & Rent Details": [
        "Landlord",
        "Landlord PAN",
        "Rent Month"
    ],
    "Fund Transfer (NEFT/RTGS)": [
        "Sender Account Name",
        "Sender Account Number",
        "Sender Mobile",
        "Beneficiary Account Number",
        "Beneficiary IFSC",
        "Beneficiary Account Name",
        "Beneficiary Bank",
        "Beneficiary Branch",
        "Fund TRF Purpose",
        "UTR"
    ],
    "Internal & Officer Details": [
        "Staff Name",
        "Staff PF",
        "Processing Officer",
        "Sanctioning Officer",
        "Branch Manager",
        "INSPECTING OFFICIAL",
        "Inspecting Officer",
        "Inspection Date",
        "MAKER",
        "CHECKER Name",
        "CHECKER PF",
        "CHECKER Designation"
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
        "Beneficiary Account Number": "000189800000104",
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

// Make defaultFieldValues available globally for template editor
if (typeof window !== 'undefined') {
    window.defaultFieldValues = defaultFieldValues;
    console.log('Constants.js: defaultFieldValues assigned to window with', Object.keys(defaultFieldValues).length, 'entries');
}