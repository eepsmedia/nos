/*
==========================================================================

 * Created by tim on 8/24/18.
 
 
 ==========================================================================
ui in nos2

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

nos2.ui = {
    initialize: function () {
        nos2.editorPhase = nos2.constants.kEditorPhaseNoWorld;
        nos2.ui.update();
    },

    openPaper: function (iPaperID) {
        const thePaper = nos2.currentPaper = nos2.thePapers[iPaperID];    //  thePapers is a keyed object, not an array
        nos2.currentFigure = (thePaper.guts.figures.length > 0) ? nos2.theFigures[thePaper.guts.figures[0]] : null;

        nos2.goToTabNumber(1);   //  the second tab. Note: this does an update().
    },

    viewPaper: function (iPaperID, iInJournal) {
        if (iInJournal) {

        }
    },

    update: async function () {
        //  nos2.thePapers already set when we entered the world.

        //  status bar

        document.getElementById("editorStatusBarDiv").innerHTML =
            `editor | ${nos2.state.worldCode ? nos2.state.worldCode : "no world yet"} | ${nos2.epoch}` +
            "&emsp;&emsp;<button onclick='nos2.logout()'>log out</button>" +
            `&emsp;version ${nos2.constants.version} ` +
            `&emsp;<img class="refreshButton" type="image"
                alt="refresh" title="refresh"
                src="../common/art/refresh-empty.png"
                onClick="nos2.ui.update()">`
        ;

        // main visibility

        const tJoinWorldDiv = document.getElementById("editorJoinWorldDiv");
        const tTabsDiv = document.getElementById("tabs");
        const tReviewPaperDiv = document.getElementById("yesPaperToReview");
        const tNoReviewPaperDiv = document.getElementById("noPaperToReview");

        const tReviewDispositionSection = document.getElementById("reviewDisposition");


        //  more visibility...

        tJoinWorldDiv.style.display = (nos2.editorPhase === nos2.constants.kEditorPhaseNoWorld ? "block" : "none");
        tTabsDiv.style.display = (nos2.editorPhase === nos2.constants.kEditorPhasePlaying ? "block" : "none");

        tReviewPaperDiv.style.display = (nos2.currentPaper ? "block" : "none");
        tNoReviewPaperDiv.style.display = (nos2.currentPaper ? "none" : "block");   //  if there is no current paper, say so.



        if (nos2.editorPhase === nos2.constants.kEditorPhasePlaying) {
            //      papers list div

            this.makeAndInstallPapersList();

            //      ------      REVIEWING tab       -----------

            //  set visibility of the review decision controls.
            //  i.e., you can't accept a draft paper, only one that has been submitted!

            const pCanReview = nos2.currentPaper && (
                nos2.currentPaper.guts.status === nos2.constants.kPaperStatusReSubmitted ||
                nos2.currentPaper.guts.status === nos2.constants.kPaperStatusSubmitted);
            tReviewDispositionSection.style.display = pCanReview ? "flex" : "none";

            if (nos2.currentPaper) {
                console.log("display paper for reviewer");
                document.getElementById("reviewPaperGuts").innerHTML = nos2.currentPaper.asHTML();  //  display the draft
                document.getElementById("paperConvoHistory").innerHTML = nos2.constructConvoHTML(nos2.currentPaper);
            }

            //      -------     team info tab       -----------
            this.makeAndInstallTeamsList();

            //  update the full Journal
            document.getElementById("journalDiv").innerHTML = await nos2.journal.constructJournalHTML();
        }

    },


    /**
     * Construct the list of papers that the editor has to deal with
     */
    makeAndInstallPapersList: function () {
        //  first, make an array of papers (easier to sort)

        let thePapers = [];

        Object.keys(nos2.thePapers).forEach(p => {
            const thePaper = nos2.thePapers[p]
                thePapers.push(thePaper);
        });

        thePapers.sort(Paper.paperSorter);

        const tPapersDiv = document.getElementById("paperTaskTable");
        const tRevisingPapersDiv = document.getElementById("revisingTaskTable");
        const tDraftPapersDiv = document.getElementById("draftPaperTable");

        let tPaperCount = 0;
        let tRevisingCount = 0;
        let tDraftCount = 0;
        let tPublishedCount = 0;

        let text = "<table><tr></th><th>title</th><th>status</th><th>team</th><th></th></tr>";
        let draftTable = "<table><tr><th>title</th><th>status</th><th>team</th><th></th></tr>";
        let revisingTable = "<table><tr><th>title</th><th>status</th><th>team</th><th></th></tr>";

        if (Array.isArray(thePapers)) {
            thePapers.forEach(p => {
                const tTitle = p.guts.title ? p.guts.title : "no title";
                if (p.guts.status === nos2.constants.kPaperStatusSubmitted || p.guts.status === nos2.constants.kPaperStatusReSubmitted) {
                    tPaperCount++;

                    text += "<tr>";
                    text += `<td>${tTitle}</td>`;
                    text += "<td>" + p.guts.status + "</td>";
                    text += "<td>" + (p.guts.teamCode ? nos2.theTeams[p.guts.teamCode].teamCode : "-") + "</td>";
                    text += `<td><button onclick='nos2.ui.openPaper("${p.guts.dbid}")'>review</button></td>`
                    text += "</tr>";
                } else if (p.guts.status === nos2.constants.kPaperStatusRevise) {
                    tRevisingCount ++;
                    //  revisingTable += `<tr><td>${p.guts.citation ? p.guts.citation : "-"}</td>`;
                    revisingTable += `<td>${tTitle}</td>`;
                    revisingTable += "<td>" + p.guts.status + "</td>";
                    revisingTable += "<td>" + (p.guts.teamCode ? nos2.theTeams[p.guts.teamCode].teamCode : "-") + "</td>";
                    revisingTable += `<td><button onclick='nos2.ui.openPaper("${p.guts.dbid}")'>read</button></td>`
                    revisingTable += "</tr>";
                } else if (p.guts.status === nos2.constants.kPaperStatusDraft) {
                    tDraftCount++;
                    //  draftTable += `<tr><td>${p.guts.citation ? p.guts.citation : "-"}</td>`;
                    draftTable += `<td>${tTitle}</td>`;
                    draftTable += "<td>" + p.guts.status + "</td>";
                    draftTable += "<td>" + (p.guts.teamCode ? nos2.theTeams[p.guts.teamCode].teamCode : "-") + "</td>";
                    draftTable += `<td><button onclick='nos2.ui.openPaper("${p.guts.dbid}")'>read</button></td>`
                    draftTable += "</tr>";
                } else if (p.guts.status === nos2.constants.kPaperStatusPublished) {
                    tPublishedCount++;
                }
            });
        }

        text += "</table>";

        if (tPaperCount > 0) {
            tPapersDiv.innerHTML = "<p>"
                + tPaperCount + (tPaperCount === 1 ? " paper " : " papers ")
                + "to deal with (oldest at the top)</p>" + text;
        } else {
            tPapersDiv.innerHTML = "<p>Hooray! All caught up!</p>";
        }

        if (tRevisingCount > 0) {
            tRevisingPapersDiv.innerHTML = "<p>Scientists are revising "
                + tRevisingCount + (tRevisingCount === 1 ? " paper." : " papers.")
                + "</p>" + revisingTable;
        } else {
            tRevisingPapersDiv.innerHTML = "<p>No papers are currently in revision.</p>";
        }

        if (tDraftCount > 0) {
            tDraftPapersDiv.innerHTML = "<p>Scientists are drafting "
                + tDraftCount + (tDraftCount === 1 ? " paper. " : " papers. ")
                + "</p>" + draftTable;
        } else {
            tDraftPapersDiv.innerHTML = "<p>No scientists have saved drafts.</p>";
        }

        if (tDraftCount + tRevisingCount + tPaperCount + tPublishedCount <= 0) {
            tPapersDiv.innerHTML = "<p>No papers ever. Stay tuned.</p>";
        }
    },

    makeAndInstallTeamsList: function () {
        //  convert the nos2.theTeams object into an array for display
        let tTeams = [];
        Object.keys(nos2.theTeams).forEach(tk => {
            tTeams.push(nos2.theTeams[tk]);
        });

        const teamInfoDiv = document.getElementById("editorTeamInfoDiv");

        let teamInfoGuts = "<table><tr><th>code</th><th>name</th><th>balance</th></tr>";

        tTeams.forEach(t => {
            teamInfoGuts += `<tr><td>${t.teamCode}</td><td>${t.teamName}</td><td>${t.balance}</td></tr>`;
        });
        teamInfoGuts += "</table>";

        teamInfoDiv.innerHTML = teamInfoGuts;

    },
};