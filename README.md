# Employee Attendance & Productivity System

A full-stack web application that analyzes employee attendance, leave usage, and productivity based on uploaded Excel attendance sheets.

## Features

- **Excel File Upload**: Upload .xlsx files with employee attendance data
- **Automatic Calculations**: Calculates worked hours, leaves, and productivity
- **Interactive Dashboard**: View monthly statistics and daily breakdowns
- **Multi-Employee Support**: Track multiple employees with individual dashboards
- **Business Rules Compliance**: 
  - Monday-Friday: 8.5 hours (10:00 - 18:30)
  - Saturday: 4 hours (10:00 - 14:00)
  - Sunday: Off
  - 2 leaves allowed per month

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Frontend**: HTML5, CSS3, JavaScript
- **Excel Parsing**: ~~SheetJS (xlsx)~~, ExcelJS

## Installation

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/attendance-system.git
cd attendance-system
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up MySQL database:**

```sql
sql.txt has been provided, go to SQLWorkbench, connect to database
Go to file, Open SQL Script and select "sql.txt", run the code

CREATE DATABASE attendance_db;
USE attendance_db;

CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    department VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    date DATE NOT NULL,
    in_time DATETIME,
    out_time DATETIME,
    worked_hours DECIMAL(5,2) DEFAULT 0,
    expected_hours DECIMAL(5,2) NOT NULL,
    status ENUM('Present', 'Leave', 'Off') DEFAULT 'Present',
    is_weekend BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    UNIQUE KEY unique_attendance (employee_id, date)
);

CREATE INDEX idx_employee_id ON attendance(employee_id);
CREATE INDEX idx_date ON attendance(date);
CREATE INDEX idx_status ON attendance(status);

SHOW TABLES;

```

4. **Configure environment variables:**

Create a `.env` file in the project root:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=attendance_db
DB_PORT=3306

PORT=3000
NODE_ENV=development
```

5. **Run the application:**
```bash
npm start
```

6. **Open browser:**
```
http://localhost:3000
```

## Excel File Format

**Supported Formats:**
- Date: `YYYY-MM-DD` or `DD/MM/YYYY`
- Time: `HH:MM` (24-hour format)

## Metrics Calculated

- **Total Expected Hours**: Based on working days in the selected month
- **Total Actual Hours**: Sum of all worked hours from attendance records
- **Leaves Used**: Number of working days with missing attendance (max 2 per month)
- **Productivity**: (Actual Hours / Expected Hours) × 100

## Expected Output

After uploading an Excel file:
1. **Upload Success Message**: By localhost:3000 :"File uploaded successfully!"
2. **Employee Dropdown**: Lists all employees from the uploaded file
