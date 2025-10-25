const formatDate = (dateString) => {
    if (!dateString) return ''; 
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date'; 

    const options = { 
        day: '2-digit', 
        month: 'short',
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit', 
        hour12: true 
    };
    
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(date);

    const day = parts.find(part => part.type === 'day').value;
    const month = parts.find(part => part.type === 'month').value;
    const year = parts.find(part => part.type === 'year').value;
    const hour = parts.find(part => part.type === 'hour').value;
    const minute = parts.find(part => part.type === 'minute').value;
    const second = parts.find(part => part.type === 'second').value;
    const period = parts.find(part => part.type === 'dayPeriod').value; // AM or PM

    return `${day}-${month}-${year} ${hour}:${minute}:${second} ${period}`;
};

export default formatDate;