<template>
    <section class="flex items-center justify-center min-h-screen px-4 font-khmer mt-[-100px]">
        <div class="text-center">
            <div class="relative w-full mx-auto">
                <img src="https://cdn.dribbble.com/users/285475/screenshots/2083086/dribbble_1.gif"
                    alt="404 Illustration" class="w-full h-auto" />
                <h1
                    class="text-8xl font-bold text-gray-800 absolute top-[80%] left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    404
                </h1>
            </div>
            <div class="">
                <h2 class="text-2xl font-semibold text-gray-700">Oops! Page Not Found</h2>
                <p class="text-gray-500 mt-2">The page you are looking for doesn't exist or has been moved.</p>
                <router-link to="/login"
                    class="mt-2 inline-block px-6 py-3 text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition">
                    Go Back Home
                </router-link>
            </div>
        </div>
    </section>
</template>
