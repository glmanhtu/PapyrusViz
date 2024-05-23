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

import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CategoryDTO, ImgDto, MatchingResponse, ProjectDTO } from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { MatchingButtonComponent } from '../../../../shared/components/matching-button/matching-button.component';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'sim-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild(MatchingButtonComponent) matchingButton: MatchingButtonComponent;

  matchings: MatchingResponse[] = [];
  thumbnails: ImgDto[] = [];

  scrollTop = new Map<number, number>;

  @Input()
  projectDto: ProjectDTO;
  categories: CategoryDTO[] = [];

  threshold = new FormControl(0.75)
  forceControl = new FormGroup({
    charge: new FormControl(-100),
    textMode: new FormControl('0'),
    autoColor: new FormControl('1')
  })


  constructor(
  ) {}

  ngOnInit(): void {
  }

  onScroll() {
  }
}
