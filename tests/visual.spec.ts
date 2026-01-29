import { expect, test, type Page } from '@playwright/test';

const disableAnimations = async (page: Page) => {
	await page.addStyleTag({
		content: `
			*, *::before, *::after {
				animation-duration: 0s !important;
				animation-delay: 0s !important;
				transition-duration: 0s !important;
				transition-delay: 0s !important;
				scroll-behavior: auto !important;
			}
		`
	});
};

test.describe('visual snapshots', () => {
	test('default timer view', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/');
		await disableAnimations(page);
		await expect(page).toHaveScreenshot('home.png');
	});

	test('settings overlay', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/?visual=settings');
		await disableAnimations(page);
		await page.locator('.settings-panel').waitFor();
		await expect(page).toHaveScreenshot('settings.png');
	});

	test('shortcuts overlay', async ({ page }: { page: Page }) => {
		await page.setViewportSize({ width: 1280, height: 720 });
		await page.goto('/?visual=shortcuts');
		await disableAnimations(page);
		await page.locator('.shortcuts-panel').waitFor();
		await expect(page).toHaveScreenshot('shortcuts.png');
	});
});
