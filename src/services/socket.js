import { io } from "socket.io-client";
import API_CONFIGS from '@/api/config';

const socket = io(API_CONFIGS.BASE_URL);

export default socket;

