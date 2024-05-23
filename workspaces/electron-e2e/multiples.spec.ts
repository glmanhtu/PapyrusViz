/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import MultiplesPage from './pageobjects/multiples.page.ts';

describe('A simple test to check if a given input matches with computed multiples', () => {
	describe('Multiples component should', () => {
		it('show up on startup', async () => {
			await expect(MultiplesPage.root).toBeDisplayed();
		});

		const number = Math.floor(Math.random() * 100) % 10;
		it(`display expected results on input (${number})`, async () => {
			await MultiplesPage.enterInput(number);
			const results = await MultiplesPage.results;
			expect(results.length).toBe(10);
			for (const index of results.keys()) {
				const ntimes = 1 + index;
				const expected = `${number} * ${ntimes} = ${number * ntimes}`;
				expect(await results[index].getText()).toEqual(expected);
			}
		});
	});
});
