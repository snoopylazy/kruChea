import { ref } from 'vue';

export const useDateFormatter = () => {
  const formattedDate = ref(''); 

  // Function to format the date as dd-mmm-yyyy
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';

    const options = { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric'
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    return formatter.format(date).replace(',', '').replace(/\//g, '-');
  };

  const updateFormattedDate = (date) => {
    formattedDate.value = formatDate(date);
  };

  return {
    formattedDate,
    formatDate,
    updateFormattedDate
  };
};
