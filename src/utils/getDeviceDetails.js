export function getDeviceDetails() {
    const userAgent = navigator.userAgent;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;

    return {
        userAgent,
        screenWidth,
        screenHeight,
    };
}