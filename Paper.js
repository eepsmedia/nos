/*
==========================================================================

 * Created by tim on 10/2/18.
 
 
 ==========================================================================
Paper in nos2

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

class Paper {
    constructor(iGuts = null) {
        if (iGuts) {
            this.guts = iGuts;
        } else {
            this.guts = {
                dbid: null,
                visible: true,     //  visible to author? (yes, until explicitly hidden)
                title: "",
                authors: "",
                text: "",

                worldCode: nos2.state.worldCode,       //  not needed, but possibly interesting to überGods
                teamCode: nos2.state.teamCode,
                teamName: nos2.state.teamName,     //  redundant but useful
                created: new Date(),       //  when the user first created this Paper

                convo: [],     //  array of objects e.g.,  {from : "author", text : "WTF??"}

                figures: [],       //  array of dbids of Figures for This Paper

                status: nos2.constants.kPaperStatusDraft,
                submitTime : null,
                pubYear: null,     //  publication epoch
                pubTime: null,     //  the Date() when it was published; used for chron sorting
                citation: null,      //  how we will be cited
                references: [],    //  dbids of relevant papers
            }
        }
    }

    isEditable() {
        return (
            this.guts.status === nos2.constants.kPaperStatusDraft ||
            this.guts.status === nos2.constants.kPaperStatusRevise
        );
    }

    setThisFigure(iFigureDBID) {
        this.guts.figures = [iFigureDBID];
        console.log("Set figure (dbid) " + iFigureDBID + " for paper " + this.guts.title);
    }

    /**
     * Not currently used because we're restricting papers to ONE figure; use setThisFigure().
     * @param iFigure
     */
    addFigure(iFigure) {

        if (this.guts.figures.includes(iFigure.dbid)) {
            console.log("Paper " + this.guts.title + " already has figure " + iFigure.guts.text.title);
        } else {
            this.guts.figures.push(iFigure.dbid);
            console.log("Added figure " + iFigure.guts.text.title + " to paper " + this.guts.title);
        }
    }

    removeAllFigures() {
        this.guts.figures = [];
    }

    /**
     * Used to find out how much knowledge this Paper carries
     * For now, looks only at the results in the first figure
     *
     * Does not go to the DB. Just gets the results from stored data in `nos2.theFigures`.
     */
    resultsArray() {
        //  console.log("Paper.resultsArray()");
        if (this.guts.figures.length > 0) {
            const theFirstFigure = nos2.theFigures[this.guts.figures[0]];
            return theFirstFigure.guts.results;
        } else {
            return [];
        }
    }

    findUnknownResultsInThisPaper() {
        const theResultIDs = [];

        if (nos2.state.teamCode) {
            this.guts.figures.forEach(figID => {
                const theFigure = nos2.theFigures[figID];
                theFigure.guts.results.forEach(resultID => {
                    const tKnown = (nos2.theTeams[nos2.state.teamCode]).known;
                    if (!tKnown.includes(resultID)) {
                        theResultIDs.push(resultID);
                    }
                })
            })
        }
        return theResultIDs;
    }



    asHTML() {
        let figureHTML;
        let referencesHTML;
        const thisPapersResultsDBIDs = this.resultsArray();

        //  count how many results for this paper are unknown to this team

        const unknownResults = this.findUnknownResultsInThisPaper();
        const learnResultsHTML = `
        <div>
            <p>This paper has ${unknownResults.length} 
            result${(unknownResults.length === 1) ? "" : "s"}
            found by other teams that you are not aware of.
            <button onclick='fireConnect.assertKnownResult(${JSON.stringify(unknownResults)})'>
            learn ${(unknownResults.length === 1) ? "it!" : "them!"}
            </button>
        </div>
        `
        if (this.guts.figures.length > 0) {
            const theFigure = nos2.theFigures[this.guts.figures[0]];
            figureHTML = `<svg width="333" viewBox="${theFigure.viewBoxString()}">${theFigure.guts.image.contents}</svg>
                    <p>${theFigure.guts.text.caption}</p>`;

        } else {
            figureHTML = "<p>no figures</p>";
        }

        if (this.guts.references.length) {
            referencesHTML = "<h3>References</h3><ul>";
            this.guts.references.forEach(rid => {
                const paper = nos2.thePapers[rid];
                referencesHTML += `<li>${paper.guts.citation}</li>`;
            });
            referencesHTML += "</ul>";
        } else {
            referencesHTML = "<p>no references</p>";
        }

        const citationHTML = this.guts.citation ? `(${this.guts.citation})` : `(${this.guts.status})`;

        const theTitle = this.guts.title ? this.guts.title : "NO TITLE";
        const theAuthors = this.guts.authors ? this.guts.authors : "NO AUTHORS";
        const theText = this.guts.text ? this.guts.text : "NO TEXT";
        const out = `
                    <div class="paper">
                    <div class="paperTitle">${theTitle} ${citationHTML}</div>
                    <div class="paperAuthors">${theAuthors}</div>
                    <div class="paperTeam">${this.guts.teamName}</div>
                    <br>
                    <div class="paperText">${theText}</div>
                    ${figureHTML}
                    ${referencesHTML}
                    ${ (unknownResults.length > 0 && this.guts.status === nos2.constants.kPaperStatusPublished) ? 
                        learnResultsHTML : ``}
                    </div>
                    `;

        return out;
    }

    createCitation() {
        return this.guts.authors + " " + nos2.epoch;
    }

    async submit() {
        const tNewStatus =
            (this.guts.status === nos2.constants.kPaperStatusRevise) ?
                nos2.constants.kPaperStatusReSubmitted :
                nos2.constants.kPaperStatusSubmitted;
        this.guts.status = tNewStatus;

        this.guts.authors = document.getElementById("paperAuthorsBox").value;
        this.guts.title = document.getElementById("paperTitleBox").value;
        this.guts.text = document.getElementById("paperTextBox").value;

        this.submitTime = new Date();

        const tPaperDBID = await fireConnect.savePaperToDB(nos2.currentPaper);

    }

    async publish() {
        this.guts.pubTime = new Date();
        this.guts.pubYear = nos2.epoch;
        this.guts.status = nos2.constants.kPaperStatusPublished;
        this.guts.citation = this.createCitation();

        this.addReferences(this.collectAutomaticReferences());  //  make sure all auto-adds are present

        //  set the "paper" or "citation" of all its results

        let thePromises = [];

        this.guts.figures.forEach((figDBID) => {
            const theFigure = nos2.theFigures[figDBID];
            if (!theFigure.guts.citation) {
                theFigure.guts.citation = this.guts.dbid;
                thePromises.push(fireConnect.saveFigureToDB(theFigure));
                theFigure.guts.results.forEach((resDBID) => {
                    const theResult = nos2.theResults[resDBID];
                    if (!theResult.citation) {
                        theResult.citation = this.guts.dbid;
                        thePromises.push(fireConnect.saveResultToDB(theResult));
                    }
                })
            }
        });

        await Promise.all(thePromises);
    }

    collectAutomaticReferences() {

        let out = [];

        this.guts.figures.forEach((figDBID) => {
            const theFigure = nos2.theFigures[figDBID];
            theFigure.guts.results.forEach((resDBID) => {
                const theResult = nos2.theResults[resDBID];
                if (theResult.citation) {
                    out.push(theResult.citation);
                }
            })

        });

        return out;
    }

    addReferences(iRefs) {
        if (!Array.isArray(iRefs)) {
            iRefs = [iRefs]
        }

        iRefs.forEach(r => {
            if (!this.guts.references.includes(r)) {
                this.guts.references.push(r)
            }
        })
    }

    removeReferences(iRefs) {
        if (!Array.isArray(iRefs)) {
            iRefs = [iRefs]
        }

        iRefs.forEach(r => {
            const ix = this.guts.references.indexOf(r);
            if (ix >= 0) {
                this.guts.references.splice(ix, 1);
            }
        })
    }

    handleReferenceCheckboxChange(e) {
        const isChecked = e.checked;
        const theReference = e.value;
        if (isChecked) {
            this.addReferences(theReference);
        } else {
            this.removeReferences(theReference);
        }
    }

    static paperSorter(a, b) {
        if (a.pubTime && b.pubTime) {
            return (a.guts.pubTime.seconds - b.guts.pubTime.seconds);
        } else if (a.submitTime && b.submitTime) {
            return (a.guts.submitTime.seconds - b.guts.submitTime.seconds);
        } else if (a.created && b.created) {
            return (a.guts.created.seconds - b.guts.created.seconds);
        } else {
            return 0;
        }
    }

}


paperConverter = {
    toFirestore: function (iPaper) {
        return iPaper.guts;
    },
    fromFirestore: function (iSnap, options) {
        const theData = iSnap.data();
        return new Paper(theData);
    }
};



