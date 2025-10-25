
const getStatusClass = (status) =>{
    return status === 'available' ? 'fa-solid fa-circle-check text-green-500' : 'fa-solid fa-ban text-red-600';

}
export default getStatusClass;