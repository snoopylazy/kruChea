<script>
export default function getStatusClass(status) {
    return status
        ? 'fa-solid fa-check-circle  text-emerald-500 animate-pulse drop-shadow-md transition-transform duration-300 hover:scale-105'
        : 'fa-solid fa-circle-xmark  text-red-600 animate-pulse drop-shadow-md transition-transform duration-300 hover:scale-105';
}


</script>