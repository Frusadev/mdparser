export function isAlphaNumeric(str: string): boolean {
	return /^[A-Za-z0-9]+$/.test(str);
}

export function isAsciiAlpha(str: string): boolean {
	return /^[A-Za-z]+$/.test(str);
}
