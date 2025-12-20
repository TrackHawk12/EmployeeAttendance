function parseExcelDate(serial) {
    if (typeof serial === 'number') {
   
        const utc_days = Math.floor(serial - 25569);
        const utc_value = utc_days * 86400;
        const date_info = new Date(utc_value * 1000);
        return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate());
    }

    return new Date(serial);
}


function parseTime(dateObj, timeStr) {
    const timeString = String(timeStr).trim();
    const date = new Date(dateObj);
    
    const match = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const period = match[3]?.toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        date.setHours(hours, minutes, 0, 0);
    }
    
    return date;
}


function calculateWorkedHours(inTime, outTime) {
    const diffMs = outTime - inTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
}

function getExpectedHours(date) {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) return 0;
    if (dayOfWeek === 6) return 4;       
    return 8.5;                            
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}


function formatDateTime(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}

function getDayName(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
}

module.exports = {
    parseExcelDate,
    parseTime,
    calculateWorkedHours,
    getExpectedHours,
    formatDate,
    formatDateTime,
    getDayName
};
