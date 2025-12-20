const XLSX = require('xlsx');
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

        // Parse Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            return res.status(400).json({ error: 'Excel file is empty' });
        }

        const employees = new Set();
        const attendanceRecords = [];

        // Process each row
        for (const row of data) {
            // Extract data (handle various column name formats)
            const employeeId = row['Employee ID'] || row['EmployeeID'] || row['Employee'];
            const employeeName = row['Employee Name'] || row['Name'] || employeeId;
            const dateStr = row['Date'];
            const inTimeStr = row['In Time'] || row['InTime'] || row['In-Time'];
            const outTimeStr = row['Out Time'] || row['OutTime'] || row['Out-Time'];

            if (!employeeId || !dateStr) continue;

            const empId = String(employeeId).trim();
            const empName = String(employeeName).trim();
            employees.add(JSON.stringify({ id: empId, name: empName }));

            // Parse date
            const date = parseExcelDate(dateStr);
            const dayOfWeek = date.getDay();
            const expectedHours = getExpectedHours(date);

            let status = 'Present';
            let workedHours = 0;
            let inTime = null;
            let outTime = null;

            // Determine status
            if (dayOfWeek === 0) {
                status = 'Off';
            } else if (inTimeStr && outTimeStr) {
                inTime = parseTime(date, inTimeStr);
                outTime = parseTime(date, outTimeStr);
                workedHours = calculateWorkedHours(inTime, outTime);
                status = 'Present';
            } else if (expectedHours > 0) {
                status = 'Leave';
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
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6
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