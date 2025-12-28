const ExcelJS = require('exceljs');

async function generateFinalExcel() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Attendance');

    // Headers
    worksheet.addRow(['Employee ID', 'Employee Name', 'Date', 'In Time', 'Out Time']);

    const employees = [
        { id: 'EMP001', name: 'John Gonkiewicza' },
        { id: 'EMP002', name: 'Eden Gowika' },
        { id: 'EMP003', name: 'Ferdinand Fazbjorn' }
    ];

    // March 2025: 31 days
    for (let day = 1; day <= 30; day++) {
        const date = new Date(2025, 2, day); // March (month 2)
        const dayOfWeek = date.getDay();
        const dateStr = `2025-03-${String(day).padStart(2, '0')}`;
        
        employees.forEach(emp => {
            let inTime, outTime;
            
            // Sunday (0) - Blank
            if (dayOfWeek === 0) {
                inTime = '';
                outTime = '';
            }
            // Saturday (6) - Half day
            else if (dayOfWeek === 6) {
                inTime = '10:00 AM';
                outTime = '2:00 PM';
            }
            // Weekday (1-5) - Full day
            else {
                // 5% chance of leave
                if (Math.random() < 0.05) {
                    inTime = '';
                    outTime = '';
                } else {
                    // Random in: 9:50-10:15
                    const inMin = Math.floor(Math.random() * 25);
                    inTime = inMin < 10 ? `9:${50+inMin} AM` : `10:${String(inMin-10).padStart(2,'0')} AM`;
                    
                    // Random out: 6:20-6:45
                    const outMin = 20 + Math.floor(Math.random() * 25);
                    outTime = `6:${String(outMin).padStart(2,'0')} PM`;
                }
            }
            
            worksheet.addRow([emp.id, emp.name, dateStr, inTime, outTime]);
        });
    }

    await workbook.xlsx.writeFile('final_test.xlsx');
    console.log('✅ Created: final_test.xlsx');
    console.log('\n📅 Sample data:');
    console.log('   Mar 1 (Sat): 10:00 AM - 2:00 PM');
    console.log('   Mar 2 (Sun): (blank)');
    console.log('   Mar 3 (Mon): ~10:00 AM - ~6:30 PM');
}

generateFinalExcel();