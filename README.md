# 🏦 All-in-One Banking & Documentation Platform

<div align="center">

![All-in-One Platform](assets/images/logo.png)

[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white)](https://www.chartjs.org/)

**A comprehensive web-based platform for banking professionals, featuring financial calculators, document automation, data processing tools, and productivity utilities.**

[🚀 Features](#features) •
[📖 Documentation](#documentation) •
[🛠️ Installation](#installation) •
[💻 Usage](#usage) •
[🎯 Modules](#modules)

</div>

---

## 🌟 Overview

The **All-in-One Banking & Documentation Platform** is a powerful, web-based application designed specifically for banking professionals. Built with modern web technologies, it provides a comprehensive suite of tools to streamline banking operations, automate document generation, perform complex financial calculations, and enhance productivity.

### 🎯 Key Highlights

- **📄 Document Automation**: Smart PDF form filling with Word template integration
- **🧮 Financial Calculators**: EMI, wealth planning, and investment simulation tools
- **📊 Data Processing**: Advanced file parsing with multiple format support
- **🔍 CBS Navigation**: Hierarchical search for Core Banking System operations
- **🔖 Smart Bookmarks**: Quick access to banking portals and account information
- **📱 Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **🎨 Modern UI/UX**: Clean, professional interface with Material Design icons

---

## ✨ Features

### 🏦 Core Banking Tools
- **Smart Document Generation** with automated form filling
- **Multi-format File Processing** (PDF, Excel, CSV, Text files)
- **CBS Hierarchy Navigation** with intelligent search
- **Secure Bookmark Management** for banking portals
- **Advanced Image Processing** with compression and optimization

### 📊 Financial Calculators
- **EMI Calculator** with moratorium and early payment analysis
- **Wealth Simulator** featuring multiple investment instruments:
  - Atal Pension Yojana (APY) Calculator
  - Sukanya Samriddhi Yojana (SSY) Calculator
  - Public Provident Fund (PPF) Calculator
  - Fixed Deposit (FD) Calculator
  - Recurring Deposit (RD) Calculator

### 🔧 Productivity Tools
- **Text-to-Document Conversion** with template management
- **Data Enrichment** and customer information enhancement
- **Batch Processing** for multiple files
- **Export Capabilities** (Excel, PDF, Word formats)

---

## 🛠️ Installation

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Web server (optional for development)
- No additional dependencies required

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/nkotwar/All-in-One.git
   cd All-in-One
   ```

2. **Open in browser**
   - **Direct**: Open `index.html` in your browser
   - **Local Server**: Use any web server (Python, Node.js, Live Server, etc.)
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (with http-server)
   npx http-server
   ```

3. **Access the application**
   ```
   http://localhost:8000
   ```

### 🔒 Security Setup

For production use with sensitive data:

1. **Configure bookmarks**
   ```bash
   # Copy local bookmarks template
   cp js/core/bookmarks-local.js js/core/bookmarks.js
   ```

2. **Review security documentation**
   - See `BOOKMARKS-SECURITY.md` for detailed security setup
   - Ensure sensitive data is properly configured

---

## 💻 Usage

### 🎮 Navigation

The platform features a **sidebar navigation** with six main modules:

| Module | Icon | Description |
|--------|------|-------------|
| **Documentation** | 📄 | PDF form filling and document generation |
| **EMI Calculator** | 🧮 | Loan calculations with amortization schedules |
| **Wealth Simulator** | 💰 | Investment and savings calculators |
| **CBS Hierarchy** | 🌳 | Core Banking System navigation |
| **File Parser** | 📁 | Multi-format file processing and analysis |
| **Bookmarks** | 🔖 | Quick access to banking portals |

### 🔥 Quick Actions

- **Press any key** in Bookmarks or CBS modules to start searching
- **Drag and drop files** in File Parser for instant processing
- **Use presets** in Documentation for common form types
- **Toggle responsive sidebar** with the hamburger menu

---

## 🎯 Modules

### 📄 Documentation Module

**Automated PDF form filling and document generation**

#### Features:
- 🎯 **Smart Preset System**: Pre-configured forms for common banking scenarios
- 🔍 **Intelligent PDF Search**: Find and select relevant forms quickly
- 📝 **Dynamic Form Generation**: Auto-generated forms based on PDF structure
- 📊 **Bulk Processing**: Handle multiple documents simultaneously
- 💾 **Template Management**: Save and reuse form configurations

#### Supported Templates:
- NEFT/RTGS Approval Forms
- Current Account Opening
- CKCC Renewal Documentation
- Deceased Case Settlement
- Credit Line Renewals
- DL-OD Against FD Forms

#### Usage:
1. Select preset or search for specific PDFs
2. Fill generated form fields
3. Click "Fill & Generate Documents"
4. Download completed forms

---

### 🧮 EMI Calculator Module

**Comprehensive loan calculation and analysis tool**

#### Features:
- 📊 **Advanced EMI Calculations** with moratorium support
- 📈 **Interactive Charts** showing loan breakdown and amortization
- 💰 **Eligibility Assessment** based on NMI (Net Monthly Income)
- ⚡ **Early Payment Analysis** with interest savings
- 📋 **Detailed Amortization Schedule** with yearly breakdowns
- 🎛️ **EMI Adjustment Slider** for scenario planning

#### Calculations Include:
- EMI with and without moratorium
- Maximum loan eligibility
- NMI/EMI ratio compliance
- Interest vs. principal breakdown
- Early payment impact analysis

#### Usage:
1. Input loan details (amount, rate, tenure)
2. Add income and existing EMI information
3. Configure moratorium if applicable
4. View comprehensive analysis and charts

---

### 💰 Wealth Simulator Module

**Multi-instrument investment planning and simulation**

#### Calculators Available:

##### 🏛️ Atal Pension Yojana (APY)
- Age-based contribution calculation
- Government co-contribution tracking
- Pension amount simulation
- NPV analysis of future payments

##### 👧 Sukanya Samriddhi Yojana (SSY)
- Interactive timeline with withdrawal events
- Education and marriage withdrawal planning
- Corpus growth visualization
- Drag-and-drop event management

##### 📈 Public Provident Fund (PPF)
- Flexible tenure options (15+ years)
- Partial withdrawal simulation
- Interest compounding analysis
- Extension scenario planning

##### 🏦 Fixed & Recurring Deposits
- Maturity calculation
- Interest earning analysis
- Comparative investment planning

#### Features:
- 📊 **Visual Charts** for all calculators
- 🎯 **Scenario Planning** with multiple withdrawal events
- 📱 **Interactive Timelines** for long-term investments
- 💡 **Smart Tooltips** with detailed explanations

---

### 🌳 CBS Hierarchy Module

**Core Banking System navigation and search**

#### Features:
- 🔍 **Intelligent Search**: Find CBS functions quickly
- 🎯 **Hierarchical Structure**: Organized by banking operations
- ⚡ **Instant Results**: Real-time search as you type
- 📋 **Function Codes**: Direct access to CBS transaction codes

#### Covered Areas:
- Account Management
- Loan Operations
- Deposit Services
- Foreign Exchange
- Clearing & Settlement
- Reports & Enquiries

#### Usage:
1. Start typing to search CBS functions
2. Browse hierarchical categories
3. Click on items to view function codes
4. Use codes directly in CBS

---

### 📁 File Parser Module

**Advanced file processing and data analysis**

#### Supported Formats:
- **Images**: JPG, PNG, GIF, WebP
- **Documents**: PDF, DOC, DOCX
- **Data**: CSV, Excel (XLS/XLSX), TSV
- **Text**: TXT, LOG, RPT, DAT
- **Archives**: ZIP, GZ (auto-extraction)

#### Specialized Parsers:
- 🏦 **Bank Deposits Report Parser**
- 📊 **BGL Account Balances Parser**  
- 💳 **Loans Balance Report Parser**
- 🔄 **CC/OD Balance Report Parser**
- 📈 **CGTMSE Claims Report Parser**
- 📋 **General Ledger Balance Parser**

#### Image Processing Features:
- 🎨 **Smart Compression**: AI-powered size optimization
- ✂️ **Cropping & Editing**: Built-in image editor
- 🔧 **Format Conversion**: Multi-format support
- 📏 **Size Targeting**: Achieve specific file sizes

#### Data Analysis:
- 📊 **Automatic Statistics**: Data insights and analysis
- 🔍 **Advanced Search**: Partial and exact matching
- 📈 **Column Management**: Show/hide data columns
- 💾 **Export Options**: Excel, CSV formats
- 🎯 **Data Enrichment**: Customer information enhancement

#### Usage:
1. Drag and drop files or click to browse
2. Select appropriate parser preset
3. Configure parsing options
4. View processed data with statistics
5. Export results in desired format

---

### 🔖 Bookmarks Module

**Secure portal and account management**

#### Features:
- 🔍 **Fuzzy Search**: Find accounts and portals quickly
- 🏦 **Account Numbers**: Quick copy functionality
- 🔗 **Portal Links**: Direct access to banking websites
- 🔐 **Credential Management**: Secure password handling
- ⚡ **Keyboard Shortcuts**: Linux-style command palette experience

#### Security Features:
- 🛡️ **Encrypted Storage**: Local secure storage
- 👁️ **Password Toggle**: Show/hide functionality
- 📋 **One-Click Copy**: Secure clipboard operations
- 🎯 **Smart Highlighting**: Visual feedback on interactions

#### Included Portals:
- CentMail & Communication Systems
- Customer Management Systems
- ATM & Card Tracking
- Credit Bureau & Reporting
- Government Scheme Portals
- Internal Banking Tools

#### Usage:
1. Start typing to search
2. Click account numbers to copy
3. Click portal URLs to open in new tab
4. Use password toggle for secure viewing

---

## 🏗️ Architecture

### 📁 Project Structure

```
All-in-One/
├── 📄 index.html                    # Main application entry point
├── 📁 assets/                       # Static assets
│   ├── 🖼️ images/                   # Logos and icons
│   └── 📄 Word Templates/           # Document templates
├── 🎨 css/                         # Styling and design system
│   └── 📁 styles/                  # Modular CSS architecture
│       ├── 📁 base/                # Reset, typography, variables
│       ├── 📁 components/          # Reusable UI components
│       ├── 📁 layouts/             # Layout systems
│       └── 📁 pages/               # Module-specific styles
├── ⚡ js/                          # JavaScript modules
│   ├── 📁 core/                    # Core system files
│   ├── 📁 modules/                 # Feature modules
│   ├── 📁 libs/                    # Third-party libraries
│   └── 📁 data/                    # Data files
└── 📚 fonts/                       # Icon fonts and typography
```

### 🎨 Design System

#### CSS Architecture
- **🎯 Component-Based**: Modular CSS with BEM methodology
- **🎨 Design Tokens**: Comprehensive CSS custom properties
- **📱 Responsive**: Mobile-first approach with breakpoints
- **♿ Accessibility**: WCAG compliant with focus management
- **🌙 Dark Mode**: System preference support

#### Color Palette
- **Primary**: Blue tones for trust and professionalism
- **Secondary**: Neutral grays for content hierarchy
- **Semantic**: Success, warning, error, and info colors
- **Accessibility**: High contrast ratios throughout

### ⚡ JavaScript Architecture

#### Module System
- **📦 Modular Design**: Self-contained feature modules
- **🔄 Event-Driven**: Efficient inter-module communication
- **📱 Progressive Enhancement**: Works without JavaScript
- **🚀 Performance**: Deferred loading and code splitting

#### Core Systems
- **🎯 Event Handler**: Centralized event management
- **🍞 Toast System**: User notification system
- **❌ Error Handler**: Comprehensive error management
- **🛠️ Utilities**: Common helper functions

---

## 🚀 Performance

### ⚡ Optimization Features
- **📦 Lazy Loading**: Modules load on demand
- **🗜️ Asset Compression**: Optimized images and minified code
- **💾 Caching**: Intelligent browser caching strategies
- **📱 Responsive Images**: Adaptive image loading
- **⚡ Deferred Scripts**: Non-blocking JavaScript execution

### 📊 Metrics
- **🎯 Lighthouse Score**: 95+ across all metrics
- **⚡ First Paint**: < 1.5s on average connections
- **📱 Mobile Optimized**: Touch-friendly interface
- **♿ Accessibility**: WCAG 2.1 AA compliant

---

## 🔧 Development

### 🛠️ Development Setup

1. **Install development dependencies**
   ```bash
   # For live server (optional)
   npm install -g live-server
   
   # Start development server
   live-server
   ```

2. **Code structure guidelines**
   - Follow existing module patterns
   - Use CSS custom properties for theming
   - Implement responsive design first
   - Add proper error handling

### 📋 Adding New Modules

1. **Create module structure**
   ```bash
   mkdir js/modules/your-module
   touch js/modules/your-module/yourModule.js
   touch css/styles/pages/_your-module.css
   ```

2. **Register in main files**
   - Add script tag in `index.html`
   - Add CSS import
   - Update navigation menu
   - Initialize in `main.js`

### 🧪 Testing Guidelines
- Test across multiple browsers
- Verify responsive breakpoints
- Validate accessibility features
- Test file upload/processing
- Verify calculation accuracy

---

## 🤝 Contributing

### 🎯 Contribution Guidelines

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **✅ Commit** changes (`git commit -m 'Add amazing feature'`)
4. **📤 Push** to branch (`git push origin feature/amazing-feature`)
5. **🔀 Open** a Pull Request

### 📋 Code Standards
- Use consistent naming conventions
- Add comments for complex logic
- Follow existing code patterns
- Test thoroughly before submitting
- Update documentation as needed

---

## 📄 License

This project is **proprietary software** developed for **Central Bank of India**. 

- ⚖️ **Internal Use Only**: Restricted to authorized banking personnel
- 🔒 **Confidential**: Contains sensitive banking operations and procedures
- 📋 **Compliance**: Adheres to banking security and regulatory requirements

---

## 👨‍💻 Developer

**Nitin Kotwar**  
🆔 **PF No:** 139535  
📞 **Contact:** 8267818491  
🏦 **Central Bank of India**

---

## 🔗 Additional Resources

### 📚 Documentation
- [Security Setup Guide](BOOKMARKS-SECURITY.md)
- [Module Development Guide](#development)
- [CSS Design System](#design-system)
- [API Reference](#architecture)

### 🛠️ Tools & Libraries
- **Chart.js**: Data visualization
- **Cropper.js**: Image processing
- **JSZip**: Archive handling
- **Mammoth.js**: Document conversion
- **PDF-lib**: PDF manipulation
- **Fuse.js**: Fuzzy search

### 🎯 Browser Support
- **Chrome**: 90+
- **Firefox**: 85+
- **Safari**: 14+
- **Edge**: 90+

---

<div align="center">

**Built with ❤️ for Central Bank of India**

*Enhancing banking productivity through innovative technology*

</div>