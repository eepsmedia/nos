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
        const tJournalNameDiv = document.getElementById("journalNameBox");
        tJournalNameDiv.defaultValue = nos2.strings.sDefaultJournalName;
        univ.universeView.initialize( document.getElementById("universe") );

    },

    update: async function () {
        console.log("Admin update begins");

        //  status bar

        document.getElementById("adminStatusBarDiv").innerHTML =
            `admin | ${nos2.myGodName} | ${nos2.state.worldCode} | ${nos2.epoch}` +
            "&nbsp;&nbsp;&nbsp;&nbsp; <button onclick='nos2.userAction.newYear()'>new year</button>" +
            "&emsp;&emsp;<button onclick='nos2.logout()'>log out</button>" +
            `&emsp;version ${nos2.constants.version} ` +
            `&emsp;<img class="refreshButton" type="image"
                alt="refresh" title="refresh"
                src="../../common/art/refresh_32.png"
                onClick="nos2.ui.update()">`
        ;

        // main visibility

        const tGodLoginDiv = document.getElementById("godLoginDiv");
        const tGodChooseWorldDiv = document.getElementById("godChooseWorldDiv");
        const tTabsDiv = document.getElementById("tabs");

        tGodLoginDiv.style.display = (nos2.adminPhase === nos2.constants.kAdminPhaseNoGod ? "block" : "none");
        tGodChooseWorldDiv.style.display = (nos2.adminPhase === nos2.constants.kAdminPhaseNoWorld ? "block" : "none");
        tTabsDiv.style.display = (nos2.adminPhase === nos2.constants.kAdminPhasePlaying ? "block" : "none");


        //  join page text etc

        const tJoinType = $('input[name=joinType]:checked').val();
        const tJoinButton = document.getElementById('joinButton');
        const tJoinHelpSpan = document.getElementById("joinHelpSpan");
        const tJournalNameDiv = document.getElementById("journalNameDiv");

        switch (tJoinType) {
            case 'join':
                tJoinButton.value = nos2.strings.sJoinWorldButtonLabel;
                tJoinHelpSpan.textContent = nos2.strings.sJoinJoinTypeHelpString;
                tJournalNameDiv.style.display = "none";
                break;
            case 'new':
                tJoinButton.value = nos2.strings.sNewWorldButtonLabel;
                tJoinHelpSpan.textContent = nos2.strings.sNewJoinTypeHelpString;
                tJournalNameDiv.style.display = "block";
                break;
        }


        //  world list table
        if (nos2.adminPhase === nos2.constants.kAdminPhaseNoWorld) {
            const worldsSnap = await fireConnect.worldsCR.get();
            let tWorlds = [];
            worldsSnap.forEach(ws => {
                const aWorld = ws.data();
                if (aWorld.god === nos2.myGodID) {
                    tWorlds.push(aWorld)
                }
            });

            const tWorldDiv = document.getElementById("godChooseWorldTable");

            if (tWorlds) {
                let text = "<table><tr><th>code</th><th>nickname</th></tr>";
                tWorlds.forEach(w => {
                    console.log(`Admin lists world ${w.code}`);
                    text += "<tr><td>" + w.code + "</td>"
                        + `<td>${w.nickname}</td>
                        <td><button onclick="nos2.userAction.makeOrJoinWorld(false,'${w.code}')">join</button>
                        </td></tr>`;
                });
                text += "</table>";
                tWorldDiv.innerHTML = text;
            } else {
                tWorldDiv.innerHTML = "<p>Sorry, no worlds to display</p>";
            }
        }



        //  update everything in tabs

        if (nos2.adminPhase === nos2.constants.kAdminPhasePlaying) {
            //  teams list table
            document.getElementById("teamsHed").textContent = `Teams in ${nos2.state.worldCode}`;
            this.makeAndInstallTeamsList();

            //  money tab
            document.getElementById("moneyHed").textContent = `Money in ${nos2.state.worldCode}`;
            this.makeAndInstallMoneyList();

            //  paper table
            document.getElementById("papersHed").textContent = `Papers in ${nos2.state.worldCode}`;
            this.makeAndInstallPapersList()

            //  update the full Journal
            document.getElementById("journalDiv").innerHTML = await nos2.journal.constructJournalHTML();

            //      truth

            if (nos2.theWorld.state) {
                const worldState = JSON.parse(nos2.theWorld.state);
                univ.universeView.drawArray(worldState.truth);
            }
        }
    },

    makeDelayTextFromTicks  : function( iTicks )    {
        let out = "";

        if (iTicks < 100000) {
            out = Math.round(iTicks / 1000) + " seconds";
        }  else if (iTicks < 100 * 60 * 1000) {
            out = Math.round(iTicks / 60000) + " minutes";
        } else if (iTicks < 30 * 3600 * 1000) {
            out = Math.round(iTicks / 3600 / 1000) + " hours";
        }
        return out;
    },

    makeAndInstallTeamsList : function () {

        //  temporary ARRAY of teams
        let tTeams = [];
        Object.keys(nos2.theTeams).forEach(tk => {
            tTeams.push(nos2.theTeams[tk])
        });

        const tAch = this.countAchievements();

        const tTeamsListDiv = document.getElementById("teamsListDiv");

        if (tTeams.length > 0) {
            let text = "<table><tr><th>code</th><th>name</th>"
                + "<th>res/known</th><th>figs</th><th>pap/pub</th>"
                + "<th>balance</th><th>last seen</th></tr>";
            tTeams.forEach(t => {
                let delayText = "";
                if (t.lastChange) {
                    const now = new Date();
                    const delay = now - t.lastChange;
                    delayText = `${this.makeDelayTextFromTicks(delay)} ago`;
                } else {
                    delayText = "never";
                }
                const grantText = `grant \$${nos2.getGrantAmount()} to ${t.teamCode}: `
                text += "<tr><td>" + t.teamCode + "</td><td>" + t.teamName + "</td>"
                    + `<td>${tAch[t.teamCode].results}/${tAch[t.teamCode].knownResults}</td><td>${tAch[t.teamCode].figures}</td>`
                    + `<td>${tAch[t.teamCode].papers}/${tAch[t.teamCode].published}</td>`
                    + `<td>${t.balance}</td>`
                    + `<td>${delayText}</td>`
                    + `</tr>`;
            });
            text += "</table>";
            tTeamsListDiv.innerHTML = text;
        } else {
            tTeamsListDiv.innerHTML = "<p>Sorry, no teams to display</p>";
        }

    },

    makeAndInstallMoneyList : function() {
        //  temporary ARRAY of teams
        let tTeams = [];
        Object.keys(nos2.theTeams).forEach(tk => {
            tTeams.push(nos2.theTeams[tk])
        });

        const tMoneyListDiv = document.getElementById("moneyListDiv");

        if (tTeams.length > 0) {
            let text = "<table><tr><th>code</th><th>name</th><th>balance</th></tr>";
            tTeams.forEach(t => {

                const grantText = `grant \$${nos2.getGrantAmount()} to ${t.teamCode}: `
                text += "<tr><td>" + t.teamCode + "</td><td>" + t.teamName + "</td><td>" + t.balance + "</td>"
                    + `<td>${grantText}`
                    + `<span class="moneyButton" onclick="nos2.userAction.giveGrant('${t.teamCode}')">💵</span>`
                    + `</td></tr>`;
            });
            text += "</table>";
            tMoneyListDiv.innerHTML = text;
        } else {
            tMoneyListDiv.innerHTML = "<p>Sorry, no teams to display</p>";
        }

    },

    countAchievements : function() {
        ach = {};

        for (teamCode in nos2.theTeams) {
            ach[teamCode] = {
                papers : 0,
                published : 0,
                figures : 0,
                results : 0,
                knownResults : nos2.theTeams[teamCode].known.length,
            };
        }

        for (p in nos2.thePapers) {
            const aPaper = nos2.thePapers[p];
            const team = aPaper.guts.teamCode;
            ach[team].papers++;

            if (aPaper.guts.status === nos2.constants.kPaperStatusPublished) {
                ach[team].published++;
            }
        }

        for (f in nos2.theFigures) {
            const aFig = nos2.theFigures[f];
            const team = aFig.guts.creator;
            ach[team].figures++;
        }

        for (r in nos2.theResults) {
            const aResult = nos2.theResults[r];
            const team = aResult.teamCode;
            ach[team].results++;
        }

        return ach;
    },


    makeAndInstallPapersList : function () {
        const tPaperDiv = document.getElementById("papersListDiv");

        let tPapers = [];
        Object.keys(nos2.thePapers).forEach(k => {
            tPapers.push(nos2.thePapers[k])
        });

        if (tPapers.length > 0) {
            let text = "<table><tr><th>id</th><th>title</th><th>team</th><th>status</th><th>year</th></tr>";
            tPapers.forEach(p => {
                text += `<tr><td>${p.guts.dbid}</td><td>${p.guts.title}</td>
                        <td>${p.guts.teamCode}</td><td>${p.guts.status}</td><td>${p.guts.pubYear}</td></tr>`;
            });
            text += "</table>";
            tPaperDiv.innerHTML = text;
        } else {
            tPaperDiv.innerHTML = "<p>Sorry, no papers to display</p>";
        }

    },

};