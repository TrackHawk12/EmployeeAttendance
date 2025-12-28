const ExcelJS = require('exceljs');
const db = require('../config/database');
const {
    parseExcelDate,
    parseTime,
    calculateWorkedHours,
    getExpectedHours,
    formatDate,
    formatDateTime
} = require('../utils/dateUtils');

exports.uploadAttendance = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(req.file.buffer);
        const worksheet = workbook.worksheets[0];
        
        const data = [];
        const headers = [];

        worksheet.getRow(1).eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value;
        });

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            
            const rowData = {};
            row.eachCell((cell, colNumber) => {
                const header = headers[colNumber];
                rowData[header] = cell.value;
            });
            
            if (Object.keys(rowData).length > 0) {
                data.push(rowData);
            }
        });

        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const employees = new Set();
        const attendanceRecords = [];


        for (const row of data) {
            
        const employeeId = row['Employee ID'] || row['EmployeeID'] || row['Employee'];
        const employeeName = row['Employee Name'] || row['Name'] || employeeId;
        const dateStr = row['Date'];
        const inTimeStr = row['In Time'] || row['InTime'] || row['In-Time'];
        const outTimeStr = row['Out Time'] || row['OutTime'] || row['Out-Time'];

        if (!employeeId || !dateStr) {
            console.log(`Skipping invalid row: no employee ID or date`);
            continue;
        }

        if (String(employeeId).length > 20) {
            console.log(`Skipping row with invalid employee ID`);
            continue;
        }

        const testDate = new Date(dateStr);
        if (isNaN(testDate.getTime())) {
            console.log(`Skipping row with invalid date: ${dateStr}`);
            continue;
        }

        const empId = String(employeeId).trim();
        const empName = String(employeeName).trim();
        employees.add(JSON.stringify({ id: empId, name: empName }));

        let date;
        if (dateStr instanceof Date) {
            date = dateStr;
        } else {
            date = parseExcelDate(dateStr);
        }

        const dayOfWeek = date.getDay();
        const expectedHours = getExpectedHours(date);

        let status = 'Present';
        let workedHours = 0;
        let inTime = null;
        let outTime = null;

        console.log(`Processing: ${empId}, Date: ${formatDate(date)}, Day: ${dayOfWeek}, InTime: "${inTimeStr}", OutTime: "${outTimeStr}"`);

        if (dayOfWeek === 0) {

            status = 'Off';
            workedHours = 0;
            inTime = null;
            outTime = null;
            console.log(`  -> SUNDAY: Forced to OFF`);
        } 
        else if (!inTimeStr || !outTimeStr || 
                inTimeStr === '' || outTimeStr === '' ||
                inTimeStr === 'undefined' || outTimeStr === 'undefined' ||
                String(inTimeStr).trim() === '' || 
                String(outTimeStr).trim() === '') {

            status = expectedHours > 0 ? 'Leave' : 'Off';
            workedHours = 0;
            inTime = null;
            outTime = null;
            console.log(`  -> Missing times: ${status}`);
        } 
        else {

    inTime = parseTime(date, inTimeStr);
    outTime = parseTime(date, outTimeStr);
    
    console.log(`  -> Parsed times - In: ${inTime}, Out: ${outTime}`);
    
    if (inTime && outTime && outTime > inTime) {
        workedHours = calculateWorkedHours(inTime, outTime);
        status = 'Present';
        console.log(`  -> Calculated hours: ${workedHours}`);
    } else {
        console.log(`  -> ERROR: Failed to parse or invalid times`);
        inTime = null;
        outTime = null;
        workedHours = 0;
        status = expectedHours > 0 ? 'Leave' : 'Off';
    }
}

attendanceRecords.push({
    employeeId: empId,
    employeeName: empName,
    date: formatDate(date),
    inTime: inTime ? formatDateTime(inTime) : null,
    outTime: outTime ? formatDateTime(outTime) : null,
    workedHours,
    expectedHours,
    status,
    isWeekend: dayOfWeek === 0
});
        }

        // Insert employees
        for (const empStr of employees) {
            const emp = JSON.parse(empStr);
            await db.query(
                `INSERT INTO employees (employee_id, name) 
                 VALUES (?, ?) 
                 ON DUPLICATE KEY UPDATE name = VALUES(name)`,
                [emp.id, emp.name]
            );
        }

        // Get employee IDs from database
        const employeeIds = Array.from(employees).map(e => JSON.parse(e).id);
        const [empRows] = await db.query(
            `SELECT id, employee_id, name FROM employees WHERE employee_id IN (?)`,
            [employeeIds]
        );

        const empMap = {};
        empRows.forEach(emp => {
            empMap[emp.employee_id] = emp.id;
        });

        // Insert attendance records
        for (const record of attendanceRecords) {
            const dbEmpId = empMap[record.employeeId];
            
            await db.query(
                `INSERT INTO attendance 
                 (employee_id, date, in_time, out_time, worked_hours, expected_hours, status, is_weekend) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE 
                    in_time = VALUES(in_time),
                    out_time = VALUES(out_time),
                    worked_hours = VALUES(worked_hours),
                    expected_hours = VALUES(expected_hours),
                    status = VALUES(status),
                    is_weekend = VALUES(is_weekend)`,
                [
                    dbEmpId,
                    record.date,
                    record.inTime,
                    record.outTime,
                    record.workedHours,
                    record.expectedHours,
                    record.status,
                    record.isWeekend
                ]
            );
        }

        res.json({
            success: true,
            message: 'Attendance data uploaded successfully',
            employees: empRows.map(e => ({
                id: e.employee_id,
                name: e.name
            }))
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process file', details: error.message });
    }
};
