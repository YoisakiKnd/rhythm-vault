declare global {
	namespace App {
		interface Locals {
			user: { id: number; username: string; profilePublic: boolean } | null;
			requestId: string;
		}
	}
}

export {};
