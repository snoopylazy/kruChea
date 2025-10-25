import moment from 'moment-timezone';

const khmerMonths = [
  'មករា', 'កុម្ភៈ', 'មីនា', 'មេសា', 'ឧសភា', 'មិថុនា',
  'កក្កដា', 'សីហា', 'កញ្ញា', 'តុលា', 'វិច្ឆិកា', 'ធ្នូ'
];

export default function formatDateKhmer(date) {
  if (!date) return '';
  
  const momentDate = moment(date);
  const day = momentDate.date();
  const monthIndex = momentDate.month(); // 0-11
  const year = momentDate.year();
  
  return `${day} ${khmerMonths[monthIndex]} ${year}`;
} 