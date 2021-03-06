/*
==========================================================================

 * Created by tim on 9/25/18.
 
 
 ==========================================================================
Result in nos2

Author:   Tim Erickson

Copyright (c) 2018 by The Concord Consortium, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
==========================================================================

*/

/**
 * This is a class to hold the result of one observation, locally to this app
 * DO NOT CONFUSE THIS with a record in the `results` table of the nos2 database,
 * even though the two things have  1-1 correspondence!
 *
 */
class Result {

    /**
     * structure is
     * @param iData
     * @param iExtras
     */
    constructor(iData) {
        this.data = iData;    //  the colors, plus col, row, dim
        this.epoch = nos2.epoch;
        this.teamCode = nos2.state.teamCode;
        this.citation = null;       //      dbid of the first published paper
        this.dbid = null;
        this.selected = false;
        this.caseID = 0;       //  the ID from CODAP
    }

    toCODAPValuesObject() {
        //  flattened

        let out = this.data
        out.where = univ.convertCoordinatesToLabel([this.data.col, this.data.row]);
        out.dbid = this.dbid;
        out.epoch = this.epoch;
        out.teamCode = this.teamCode;
        out.citation = this.citation ? nos2.thePapers[this.citation].guts.citation : "local";

        return out;
    }

    toString() {
        const theLabel = univ.convertCoordinatesToLabel([this.data.col,this.data.row]);
        const theSizeString = `${this.data.dim}x${this.data.dim}`;
        return `${theLabel} ${theSizeString} ${this.toShortString()}`;
    }

    toShortString() {
        return `${this.data.R}R.${this.data.Y}Y.${this.data.G}G.${this.data.B}B`;
    }

    plaque() {
        let theColor = this.selected ? univ.colors.selected : univ.colors.unselected;
        let paper = Snap(80, 22);
        let bgRect = paper.rect(0, 0,
            paper.attr("width"),
            paper.attr("height")).attr({
            fill: theColor,
            stroke: "#567",
            "stroke-width": "3"
        });

        //  capture clicks on the plaque

        //  bgRect.click( e => {
        paper.click(e => {
            console.log("Click in plaque");
            this.toggleSelection();
        });

        //  draw the text

        let theText = paper.text(3, 18, this.toShortString());
        theText.addClass("plaqueText");

        return paper;
    }

    plaqueSVG() {
        const theLabel = univ.convertCoordinatesToLabel([this.data.col,this.data.row]);
        const theSizeString = `${this.data.dim}x${this.data.dim}`;
        const theColors = univ.constants.kPossibleColors;
        let theColorStrip = "";
        let tLeft = 2;
        const blockY = 36;  //  baseline of the second, "block" line
        const blockWidth = 17;
        const blockHeight = 16;
        const blockGap = 3;

        theColors.forEach( color => {
            const tCount = this.data[color];    //  count of that color
            const tResultColor = univ.colors[color];
            theColorStrip += `<rect x="${tLeft}" y="${blockY - blockHeight}" `;
            theColorStrip +=  ` width="${blockWidth}" height="${blockHeight}" `;
            theColorStrip +=  ` fill="${tResultColor.fill}"></rect>`;
            theColorStrip += `<text x="${tLeft+2}" y="${blockY - 3}" fill="${tResultColor.text}">${tCount}${color}</text>`;
            tLeft += (blockWidth + blockGap);
        });

        return (
            `<svg height="40" width="80" class="plaqueText">
                <rect height="40" width="80" fill="lightgray"></rect>
                
                <text x="4" y="16">${theSizeString} at ${theLabel}</text>
                ${theColorStrip}
            </svg>`
        )

    }

    toggleSelection() {
        const theCaseID = fireStoreToCODAPMaps.caseIDMap[this.dbid];
        console.log("toggling result caseID = " + theCaseID);
        if (this.selected) {
            univ.CODAPconnect.deselectTheseCases(univ.constants.kUnivDataSetName, [theCaseID]);
        } else {
            univ.CODAPconnect.selectTheseCases(univ.constants.kUnivDataSetName, [theCaseID]);
        }
        this.selected = !this.selected;
    }
}

Result.resultFromCODAPValues = function (iValues) {
    let theData = iValues;
    out = new Result(theData, {
        dbid: iValues.dbid,
        epoch: iValues.epoch,
        teamCode: iValues.teamID,
        paper: iValues.paper,
        selected: iValues.selected,
        caseID: iValues.caseID,
    });

    return out;
};


resultConverter = {
    toFirestore: function (iResult) {
        const target = {};
        Object.assign(target, iResult);
        return target;
    },
    fromFirestore: function (iSnap, options) {
        const theData = iSnap.data();
        const target = new Result();
        Object.assign(target, theData);
        return target;
    }
};
