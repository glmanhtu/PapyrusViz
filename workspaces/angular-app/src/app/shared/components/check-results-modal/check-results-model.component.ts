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

import { Component, Input } from '@angular/core';
import { VerifyItem } from 'shared-lib';

@Component({
  selector: 'app-info-modal',
  templateUrl: './check-results-model.component.html',
  styleUrls: [ './check-results-model.component.scss' ],
})
export class CheckResultsModelComponent {

  @Input()
  correct: VerifyItem[];
  incorrect: VerifyItem[];

  constructor() { }

  computeAssemblingScore() {
    return this.correct.length * 100 / (this.correct.length + this.incorrect.length);
  }
}