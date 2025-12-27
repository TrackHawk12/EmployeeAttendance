const db = require('../config/database');
const { getDayName } = require('../utils/dateUtils');

exports.getDashboard = async (req, res) => {
    try {
        const { employeeId, month } = req.query;

        if (!employeeId || !month) {
            return res.status(400).json({ error: 'Employee ID and month are required' });
        }

        const [year, monthNum] = month.split('-').map(Number);
        const startDate = new Date(year, monthNum - 1, 1);
        const endDate = new Date(year, monthNum, 0);

        const [empRows] = await db.query(
            'SELECT id, employee_id, name FROM employees WHERE employee_id = ?',
            [employeeId]
        );

        if (empRows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const employee = empRows[0];

        const [attendanceRows] = await db.query(
            `SELECT * FROM attendance 
             WHERE employee_id = ? 
             AND date >= ? 
             AND date <= ? 
             ORDER BY date ASC`,
            [employee.id, formatDate(startDate), formatDate(endDate)]
        );

        let totalExpectedHours = 0;
        let totalActualHours = 0;
        let leavesUsed = 0;
        let workingDays = 0;
        let presentDays = 0;

        const dailyBreakdown = [];
        const attendanceMap = {};

        attendanceRows.forEach(record => {
            attendanceMap[record.date.toISOString().split('T')[0]] = record;
        });

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            const dateStr = formatDate(currentDate);
            const dayOfWeek = currentDate.getDay();
            const record = attendanceMap[dateStr];

            let expectedHours = 0;
            if (dayOfWeek === 0) {
                expectedHours = 0;
            } else if (dayOfWeek === 6) {
                expectedHours = 4;
                workingDays++;
            } else {
                expectedHours = 8.5;
                workingDays++;
            }

            let status = 'Off';
            let workedHours = 0;
            let inTime = '-';
            let outTime = '-';

            if (record) {
                status = record.status;
                workedHours = parseFloat(record.worked_hours);
                if (record.in_time) {
                    const inDate = new Date(record.in_time);
                    inTime = formatTime(inDate);
                }
                if (record.out_time) {
                    const outDate = new Date(record.out_time);
                    outTime = formatTime(outDate);
                }

                if (status === 'Present') presentDays++;
                if (status === 'Leave') leavesUsed++;
            } else if (expectedHours > 0) {
                status = 'Leave';
                leavesUsed++;
            }

            totalExpectedHours += expectedHours;
            totalActualHours += workedHours;

            dailyBreakdown.push({
                date: dateStr,
                day: getDayName(currentDate),
                inTime,
                outTime,
                workedHours,
                expectedHours,
                status
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        const productivityPercentage = totalExpectedHours > 0
            ? Math.round((totalActualHours / totalExpectedHours) * 100 * 100) / 100
            : 0;

        res.json({
            summary: {
                totalExpectedHours: Math.round(totalExpectedHours * 100) / 100,
                totalActualHours: Math.round(totalActualHours * 100) / 100,
                leavesUsed,
                leavesAllowed: 2,
                productivityPercentage,
                workingDays,
                presentDays,
                absentDays: leavesUsed
            },
            dailyBreakdown
        });

    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
    }
};

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
}
