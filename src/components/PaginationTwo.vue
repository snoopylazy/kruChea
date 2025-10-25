<template>
    <div class="mt-10 flex justify-end ml-auto space-x-2" v-if="searchQuery === '' && data.length > 0">
        <!-- First Page Button (Hidden on small screens) -->
        <button @click="goToPage(1)" :disabled="currentPage === 1 || isLoading || !data.length"
            class="hidden md:inline-block p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
            :class="currentPage === 1 ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
            {{$t('First')}}
        </button>

        <!-- Previous Page Button -->
        <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1 || isLoading || !data.length"
            class="p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
            :class="currentPage === 1 ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
            {{$t('Previous')}}
        </button>

        <!-- Pagination Pages (Limit on small screens) -->
        <template v-for="page in displayedPages" :key="page">
            <span v-if="page === '...'" class="px-3 py-2 flex items-center !font-medium text-gray-500">...</span>
            <button v-else @click="goToPage(page)" :disabled="isLoading || !data.length" :class="[
                currentPage === page
                    ? 'bg-[#34D399] text-white !px-3 !py-1.5 !cursor-pointer !font-medium rounded-md'
                    : 'p-button-outlined !px-3 !py-1.5 !cursor-pointer !font-medium rounded-md'
            ]">
                {{ page }}
            </button>
        </template>

        <!-- Next Page Button -->
        <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages || isLoading || !data.length"
            class="p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
            :class="currentPage === totalPages ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
            {{$t('Next')}}
        </button>

        <!-- Last Page Button (Hidden on small screens) -->
        <button @click="goToPage(totalPages)" :disabled="currentPage === totalPages || isLoading || !data.length"
            class="hidden md:inline-block p-button-outlined !px-3 !py-1.5 !font-medium rounded-md"
            :class="currentPage === totalPages ? '!cursor-not-allowed opacity-50' : '!cursor-pointer'">
            {{$t('Last')}}
        </button>
    </div>

</template>


<style scoped>
.p-button-outlined {
    border: 1px solid #ccc;
    background-color: white;
    color: black;
}

.p-button-primary {
    border: 1px solid #34D399;
    /* emerald-400 */
    background-color: #34D399;
    color: white;
}

.p-ellipsis {
    font-weight: bold;
    text-shadow: 0 0 5px #34D399;
    /* emerald glow effect */
}

.p-ellipsis:hover {
    text-shadow: 0 0 10px #34D399;
    /* stronger glow on hover */
}
</style>

<script>
import API_CONFIGS from '@/api/config';
import socket from '@/services/socket';
import { useBranchStore } from '@/store/branchStore';
import axios from 'axios';
import moment from 'moment-timezone';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
export default {
    props: ['limitedPerPage', 'currentPage', 'searchQuery', 'isFilter', 'createdBy', 'currentDate', 'status', 'employee', 'typeOfCheck', 'transactionType', 'statusUser', 'branchId', 'village', 'commune', 'district', 'province',
        'villageClient', 'communeClient', 'districtClient', 'provinceClient', 'roleUser', 'disbursementDate', 'clientDis', 'clientDepositCollateral', 'coDis', 'paymentDate', 'writeOffDate',],
    emit: ['onEmitDataFromPagination', 'onEmitIsLoading', 'onEmitCurrentPageIsLastRecord'],
    setup(props, { emit }) {
        const route = useRoute();
        const totalPages = ref(1);
        const data = ref([]);
        const isLoading = ref(false);
        const limitedPerPage = ref(props.limitedPerPage || 1);
        const currentPage = ref(props.currentPage || 1);
        const searchQuery = ref(props.searchQuery || '');
        const populate = ref(null);
        let collectionName = '';
        const searchFieldsArray = ref(null);
        let dynamicCondition = [];
        const branchStore = useBranchStore();
        let sortOrder = ''
        let sortField = '';
        const userByIDData = ref(null);
        // const mainRole = ref('')





        watch(
            () => branchStore.branchId,
            () => {
                fetchData(); // Auto-refresh when branch changes
            },
            { immediate: true }
        );

        // Watch for currentPage changes from parent
        watch(
            () => props.currentPage,
            (newPage) => {
                if (newPage !== currentPage.value) {
                    currentPage.value = newPage;
                    fetchData(); // Refetch when parent changes the current page
                }
            }
        );



        async function fetchData() {
            try {
                dynamicCondition = [];
                handleSetCollectionName();

                isLoading.value = true;

                let escapedSearchTerm = searchQuery.value ?
                    searchQuery.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';

                const params = {
                    collectionName: collectionName,
                    pageSize: limitedPerPage.value,
                    page: currentPage.value,
                    searchFields: searchFieldsArray.value,
                    populate: populate.value,
                    searchTerm: escapedSearchTerm,
                    sortField: sortField || '_id',
                    sortOrder: sortOrder ? sortOrder : 'asc',
                    dynamicConditions: JSON.stringify(dynamicCondition)
                };

                const response = await axios.get(
                    `${API_CONFIGS.BASE_URL}/loan/api/getPaginationTwo`,
                    { params, headers: API_CONFIGS.headers }
                );

                if (response.data.data.length > 0) {
                    data.value = response.data.data;
                    totalPages.value = response.data.pagination.totalPages;
                } else {
                    data.value = [];
                    totalPages.value = 1;
                }

                emit('onEmitDataFromPagination', data.value);
                emit('onEmitIsLoading', false);

            } catch (error) {
                console.error('Error fetching data:', error);
                data.value = [];
                totalPages.value = 1;
                emit('onEmitIsLoading', false);
            } finally {
                setTimeout(() => {
                    isLoading.value = false;
                }, 200);
            }
        }




        const goToPage = async (page) => {
            currentPage.value = page;
            await fetchData();
            // If after fetching, there is no data and not on the first page, go back one page
            if (data.value.length === 0 && currentPage.value > 1) {
                currentPage.value -= 1;
                await fetchData();
            }
        };




        // async function fetchUserbyID() {
        //     try {
        //         const params = {


        //             dynamicConditions: JSON.stringify([

        //                 {
        //                     field: '_id',
        //                     operator: "==",
        //                     value: branchStore.getUserId,

        //                 },
        //             ])
        //         };

        //         const response = await axios.get(`${apiURL}/loan/api/getAllDocs/User`, { params });

        //         if (response.data.data.length > 0) {
        //             mainRole.value = response.data.data[0].mainRole;

        //         } else {
        //             mainRole.value = ''
        //         }

        //     } catch (err) {
        //         mainRole.value = ''
        //         console.log("failed to fetch data", err)
        //     }
        // }



        const setupSocketListeners = () => {
            socket.off('dataUpdate');
            socket.off('serverLastRecordResponse');

            socket.on('dataUpdate', async (data) => {
                if (data.collection === collectionName) {
                    console.log("Data update received:", data);
                    await fetchData(); // Automatically refreshes when server sends update
                }
            });

            socket.on('serverLastRecordResponse', (data) => {
                if (data.collection === collectionName) {
                    console.log("Last record response received:", data);
                    goToPage(currentPage.value - 1);
                }
            });
        };



        onMounted(async () => {





            // await fetchUserbyID();
            await fetchData();
            setupSocketListeners();
        })



        onBeforeUnmount(() => {
            socket.off('dataUpdate');
            socket.off('serverLastRecordResponse');
        });


        watch(props, async () => {
            limitedPerPage.value = props.limitedPerPage || 1;
        });

        watch(() => props.currentPage, async (newValue) => {
            if (newValue !== currentPage.value) {
                currentPage.value = newValue;
                await fetchData();
            }
        });

        watch(limitedPerPage, async () => {
            currentPage.value = 1;
            await fetchData();
        });


        watch(isLoading, (newValue) => {
            emit('onEmitIsLoading', newValue);

        }, { immediate: true });

        // Update the watch to trigger search when searchQuery prop changes
        watch(() => props.searchQuery, async (newValue) => {
            data.value = [];
            totalPages.value = 1;
            currentPage.value = 1; // Reset to first page when search changes
            searchQuery.value = newValue;

            await fetchData(); // Fetch new data with search query
        }, { immediate: true });


        watch(
            [() => props.isFilter, () => props.currentDate, () => props.currentPage],
            async () => {
                try {
                    let dynamicCondition = [];

                    // Add createdBy condition
                    if (props.createdBy) {
                        dynamicCondition.push({
                            field: 'createdBy',
                            operator: '==',
                            value: props.createdBy
                        });
                    }

                    // Only add date filter if isFilter is true and currentDate is valid
                    if (
                        props.isFilter &&
                        props.currentDate &&
                        Array.isArray(props.currentDate) &&
                        props.currentDate[0] &&
                        props.currentDate[1]
                    ) {
                        const filterStartDate = moment(props.currentDate[0]).startOf('day').tz('UTC').toDate();
                        const filterEndDate = moment(props.currentDate[1]).endOf('day').tz('UTC').toDate();

                        dynamicCondition.push(
                            {
                                field: 'createdAt',
                                operator: '&gte', // Use Mongo-like operator
                                value: filterStartDate,
                                type: "Date"
                            },
                            {
                                field: 'createdAt',
                                operator: '&lte', // Use Mongo-like operator
                                value: filterEndDate,
                                type: "Date"
                            }
                        );
                    }

                    // Status filter
                    if (props.status) {
                        dynamicCondition.push({
                            field: 'status',
                            operator: '==',
                            value: props.status
                        });
                    }

                    // User status filter
                    if (props.statusUser) {
                        dynamicCondition.push({
                            field: 'status',
                            operator: '==',
                            value: props.statusUser === 'សកម្ម' ? true : false
                        });
                    }

                    // Role filter
                    if (props.roleUser) {
                        dynamicCondition.push({
                            field: 'roleId',
                            operator: '==',
                            value: props.roleUser
                        });
                    }

                    // Employee filter
                    if (props.employee) {
                        dynamicCondition.push({
                            field: 'employeeId',
                            operator: '==',
                            value: props.employee
                        });
                    }

                    // Transaction type filter
                    if (props.transactionType) {
                        dynamicCondition.push({
                            field: 'transactionType',
                            operator: '==',
                            value: props.transactionType
                        });
                    }

                    // Type of check filter
                    if (props.typeOfCheck) {
                        dynamicCondition.push({
                            field: 'typeOfCheck',
                            operator: '==',
                            value: props.typeOfCheck
                        });
                    }

                    // Branch filter
                    if (props.branchId) {
                        dynamicCondition.push({
                            field: 'branchId',
                            operator: 'arrayContains',
                            value: props.branchId
                        });
                    }

                    // Location filters
                    if (props.village) {
                        dynamicCondition.push({
                            field: 'village',
                            operator: '==',
                            value: props.village
                        });
                    }

                    if (props.commune) {
                        dynamicCondition.push({
                            field: 'commune',
                            operator: '==',
                            value: props.commune
                        });
                    }

                    if (props.district) {
                        dynamicCondition.push({
                            field: 'district',
                            operator: '==',
                            value: props.district
                        });
                    }

                    if (props.province) {
                        dynamicCondition.push({
                            field: 'province',
                            operator: '==',
                            value: props.province
                        });
                    }

                    // Client address filters
                    if (props.villageClient) {
                        dynamicCondition.push({
                            field: 'address',
                            operator: 'objectKey',
                            value: {
                                key: 'village',
                                value: props.villageClient
                            }
                        });
                    }

                    if (props.communeClient) {
                        dynamicCondition.push({
                            field: 'address',
                            operator: 'objectKey',
                            value: {
                                key: 'commune',
                                value: props.communeClient
                            }
                        });
                    }

                    if (props.districtClient) {
                        dynamicCondition.push({
                            field: 'address',
                            operator: 'objectKey',
                            value: {
                                key: 'district',
                                value: props.districtClient
                            }
                        });
                    }

                    if (props.provinceClient) {
                        dynamicCondition.push({
                            field: 'address',
                            operator: 'objectKey',
                            value: {
                                key: 'province',
                                value: props.provinceClient
                            }
                        });
                    }

                    // Disbursement filters
                    if (props.clientDis) {
                        dynamicCondition.push({
                            field: 'borrowerId',
                            operator: '==',
                            value: props.clientDis
                        });
                    }

                    if (props.coDis) {
                        dynamicCondition.push({
                            field: 'coId',
                            operator: '==',
                            value: props.coDis
                        });
                    }

                    // Disbursement date filter
                    if (props.disbursementDate && Array.isArray(props.disbursementDate) &&
                        props.disbursementDate[0] && props.disbursementDate[1]) {
                        const filterStartDate = moment(props.disbursementDate[0]).startOf('day').tz('UTC').toDate();
                        const filterEndDate = moment(props.disbursementDate[1]).endOf('day').tz('UTC').toDate();

                        dynamicCondition.push(
                            {
                                field: 'disbursementDate',
                                operator: '>=',
                                value: filterStartDate,
                                type: "Date"
                            },
                            {
                                field: 'disbursementDate',
                                operator: '<=',
                                value: filterEndDate,
                                type: "Date"
                            }
                        );
                    }

                    // Write off date filter
                    if (props.writeOffDate && Array.isArray(props.writeOffDate) &&
                        props.writeOffDate[0] && props.writeOffDate[1]) {
                        const filterStartDate = moment(props.writeOffDate[0]).startOf('day').tz('UTC').toDate();
                        const filterEndDate = moment(props.writeOffDate[1]).endOf('day').tz('UTC').toDate();

                        dynamicCondition.push(
                            {
                                field: 'updatedAt',
                                operator: '>=',
                                value: filterStartDate,
                                type: "Date"
                            },
                            {
                                field: 'updatedAt',
                                operator: '<=',
                                value: filterEndDate,
                                type: "Date"
                            }
                        );
                    }

                    // Payment date filter
                    if (props.paymentDate && Array.isArray(props.paymentDate) &&
                        props.paymentDate[0] && props.paymentDate[1]) {
                        const filterStartDate = moment(props.paymentDate[0]).startOf('day').tz('UTC').toDate();
                        const filterEndDate = moment(props.paymentDate[1]).endOf('day').tz('UTC').toDate();

                        dynamicCondition.push(
                            {
                                field: 'createdAt',
                                operator: '>=',
                                value: filterStartDate,
                                type: "Date"
                            },
                            {
                                field: 'createdAt',
                                operator: '<=',
                                value: filterEndDate,
                                type: "Date"
                            }
                        );
                    }

                    // Deposit collateral filter
                    if (props.clientDepositCollateral) {
                        dynamicCondition.push({
                            field: 'clientId',
                            operator: '==',
                            value: props.clientDepositCollateral
                        });
                    }

                    // Fetch data after applying the filter
                    await fetchData();

                } catch (error) {
                    console.error('Error in watcher:', error);
                    // Handle error appropriately - maybe show user notification
                }
            },
            { immediate: true }
        );


        watch([data, currentPage], () => {
            if (data.value.length === 1 && currentPage.value > 1) {
                emit('onEmitCurrentPageIsLastRecord', currentPage.value);
            }
        })







        watch(data, () => {
            emit('onEmitDataFromPagination', data.value);
        });






        function handleSetCollectionName() {


            switch (route.path) {


                case '/category':
                    collectionName = 'Category';
                    searchFieldsArray.value = 'name';
                    sortOrder = 'desc';
                    break;


                case '/company-assets':
                    collectionName = 'CompanyAsset';
                    searchFieldsArray.value = 'name, idCustom';
                    sortOrder = 'desc';


                    break;
                case '/operation-assets':
                    collectionName = 'CompanyAssetTransaction';
                    populate.value = JSON.stringify(['employeeId', 'assetId']);
                    searchFieldsArray.value = 'createdAt, transactionType';
                    dynamicCondition.push({
                        field: 'branchId',
                        operator: '==',
                        value: branchStore.branchId,
                    },
                        {
                            field: 'transactionType',
                            operator: '==',
                            value: 'checkout',
                        }
                    );


                    // This is the key change: Add the transaction type from the prop to the query
                    // if (props.transactionType) {
                    //     dynamicCondition.push({
                    //         field: 'transactionType',
                    //         operator: '==',
                    //         value: props.transactionType
                    //     });
                    // }

                    if (branchStore.getUserMainRole == 'User') {
                        dynamicCondition.push({
                            field: 'chiefIds',
                            operator: 'arrayContains',
                            value: branchStore.getUserId,
                        });
                    }
                    sortOrder = 'desc';
                    break;
                case '/purchase-assets':
                    collectionName = 'PurchaseAsset';
                    populate.value = JSON.stringify(['createdBy']),
                        // dynamicCondition.push({
                        //     field: 'branchId',
                        //     operator: '==',
                        //     value: branchStore.branchId,
                        // });
                    sortOrder = 'desc';

                    break;


                case '/purchase-assets-history':
                    collectionName = 'PurchaseAssetHistory';
                    populate.value = JSON.stringify(['createdBy']),
                        searchFieldsArray.value = 'assets.assetName';
                    // dynamicCondition.push({
                    //     field: 'branchId',
                    //     operator: '==',
                    //     value: branchStore.branchId,
                    // });
                    sortOrder = 'desc';
                    break;
                case '/permission':
                    collectionName = 'User';
                    populate.value = JSON.stringify(['roleId']);
                    searchFieldsArray.value = 'displayName, username';
                    dynamicCondition.push(
                        {
                            field: 'status',
                            operator: '==',
                            value: true
                        },
                        {
                            field: 'mainRole',
                            operator: '==',
                            value: 'User'
                        }
                    );
                    break;

                // case '/stock-transfer':
                //     collectionName = 'StockTransfer';
                //     populate.value = JSON.stringify(['createdBy']);
                //     dynamicCondition.push({
                //         field: 'fromBranchId', operator: '==', value: branchStore.branchId
                //     });
                //     sortOrder = 'desc';
                //     break;









            }
        }


        // Make sure to emit loading state correctly
        watch(isLoading, (newLoadingState) => {
            emit('onEmitIsLoading', newLoadingState);
        });

        const displayedPages = computed(() => {
            const totalPagesValue = totalPages.value;
            const currentPageValue = currentPage.value;
            const siblingCount = 1; // Number of siblings around the current page
            const maxVisiblePages = 5; // Max number of pages visible including boundaries and ellipses

            // Helper function to create a range of numbers
            const range = (start, end) => {
                const length = end - start + 1;
                return Array.from({ length }, (_, i) => start + i);
            };

            if (totalPagesValue <= maxVisiblePages) {
                // If total pages are less than or equal to max visible, show all pages
                return range(1, totalPagesValue);
            }

            const startPages = 1; // Always include the first page
            const endPages = totalPagesValue; // Always include the last page

            // Calculate siblings around the current page
            const siblingsStart = Math.max(currentPageValue - siblingCount, 2); // Minimum of 2 (to leave space for the first page)
            const siblingsEnd = Math.min(currentPageValue + siblingCount, totalPagesValue - 1); // Maximum of totalPagesValue - 1 (to leave space for the last page)

            const shouldShowLeftEllipsis = siblingsStart > 2; // Ellipsis needed if there's a gap after the first page
            const shouldShowRightEllipsis = siblingsEnd < totalPagesValue - 1; // Ellipsis needed if there's a gap before the last page

            let pages = [startPages];

            if (shouldShowLeftEllipsis) {
                pages.push('...');
            }

            pages = [...pages, ...range(siblingsStart, siblingsEnd)];

            if (shouldShowRightEllipsis) {
                pages.push('...');
            }

            pages.push(endPages);

            return pages;
        });



        return {
            searchQuery,
            data,
            goToPage,
            totalPages,
            currentPage,
            displayedPages,
            isLoading,
        }

    }

}
</script>

<style></style>
