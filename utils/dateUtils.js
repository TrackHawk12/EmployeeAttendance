const IST_OFFSET_MINUTES = 5 * 60 + 30;

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
    if (!timeStr) {
        return null;
    }

    if (timeStr === '' || timeStr === '-' || timeStr === null || timeStr === undefined) {
        return null;
    }
    
    const date = new Date(dateObj);
    
 
    if (timeStr instanceof Date) {

        const utcHours = timeStr.getUTCHours();
        const utcMinutes = timeStr.getUTCMinutes();
        
        // Convert to IST by adding offset
        const totalMinutes = (utcHours * 60 + utcMinutes) + IST_OFFSET_MINUTES;
        const istHours = Math.floor(totalMinutes / 60) % 24;
        const istMinutes = totalMinutes % 60;

        date.setHours(istHours, istMinutes, 0, 0);
        
        console.log(`  -> Time conversion: UTC ${utcHours}:${utcMinutes} -> IST ${istHours}:${istMinutes}`);
        return date;
    }

    if (typeof timeStr === 'number' && timeStr >= 0 && timeStr < 1) {
        const totalMinutes = Math.round(timeStr * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
    
    const timeString = String(timeStr).trim().toUpperCase();

    const ampmMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1]);
        const minutes = parseInt(ampmMatch[2]);
        const period = ampmMatch[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    const time24Match = timeString.match(/(\d{1,2}):(\d{2})/);
    if (time24Match) {
        const hours = parseInt(time24Match[1]);
        const minutes = parseInt(time24Match[2]);
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
    
    return null;
}


function calculateWorkedHours(inTime, outTime) {
    const diffMs = outTime - inTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.round(diffHours * 100) / 100;
}

function getExpectedHours(date) {
    const dayOfWeek = date.getDay();
    
    if (dayOfWeek === 0) {
        return 0;        
    }
    if (dayOfWeek === 6) {
        return 4;        
    }
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
