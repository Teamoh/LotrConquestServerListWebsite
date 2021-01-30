(function () {
    const config = {
        // serverListApiUrl: 'assets/mock/server-list-response.json',
        serverListApiUrl: '/LotrConquestServerListService/ServerListService.svc/GetServerList',
        // serverListApiUrl: '/ServerListService.svc/GetServerList',
        levelNames: {
            black_gates: 'The Black Gate',
            helms_deep: 'Helm\'s Deep',
            isengard: 'Isengard',
            minas_morgul: 'Minas Morgul',
            minas_tirith: 'Minas Tirith',
            minas_tirith_top: 'Minas Tirith Top',
            moria: 'Mines of Moria',
            mount_doom: 'Mount Doom',
            osgiliath: 'Osgiliath',
            pelennor_fields: 'Pelennor Fields',
            rivendell: 'Rivendell',
            shire: 'The Shire',
            weathertop: 'Weathertop'
        },
        modeNames: {
            tdm: 'Team Deathmatch',
            htdm: 'Hero Team Deathmatch',
            cnq: 'Conquest',
            ctr: 'Capture the Ring',
            aslt: 'Assault',
            gcam: 'War of the Ring',
            ecam: 'Rise of Sauron'
        },
        defaultLevelName: 'Lobby',
        defaultModeName: 'Unknown'
    };

    const utils = {
        escapeHtml(input) {
            return input
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },
        addWordBreakOpportunities(input) {
            const wbr = '<wbr>';
            const replacedInput = input
                .replace(/\//g, '/' + wbr)
                .replace(/\./g, '.' + wbr)
                .replace(/\|/g, '|' + wbr);

            const hasWbrs = replacedInput.indexOf(' ') !== -1 
                || replacedInput.indexOf('-') !== -1
                || replacedInput.indexOf(wbr) !== -1;

            const chunkLength = 9;

            if (hasWbrs || replacedInput.length <= chunkLength) {
                return replacedInput;
            }

            const chunks = replacedInput.match(new RegExp(`.{1,${chunkLength}}`, 'g'));
            return chunks.join(wbr);
        }
    };

    Vue.component('server-list', {
        template: `
            <div class="server-list__body">
                <div class="server-list__loading" v-if="isLoading && !serverList">
                    <p>{{ loadingMessage }}</p>
                    <div class="server-list__loading-spinner"></div>
                </div>
                <div class="server-list__error" v-if="hasError && !isLoading">
                    <p>{{ errorMessage }}</p>
                </div>
                <template v-if="serverList && !hasError">
                    <template v-if="serverList.length">
                        <div class="server-list__timestamp" v-if="formattedTimestamp">
                            <p>last update: {{ formattedTimestamp }}</p>
                        </div>
                        <div class="server-list__table-container">
                            <table class="server-list__table">
                                <thead class="server-list__table-head">
                                    <tr class="server-list__table-row">
                                        <th class="server-list__table-th server-list__table-th--name">Server Name</th>
                                        <th class="server-list__table-th server-list__table-th--map">Map</th>
                                        <th class="server-list__table-th server-list__table-th--mode">Mode</th>
                                        <th class="server-list__table-th server-list__table-th--nr">Nr.</th>
                                    </tr>
                                </thead>
                                <tbody class="server-list__table-body">
                                    <tr class="server-list__table-row" v-for="server in serverList" :key="server.id">
                                        <td class="server-list__table-td server-list__table-td--name" v-html="server.cleanName"></td>
                                        <td class="server-list__table-td server-list__table-td--level">{{ server.level }}</td>
                                        <td class="server-list__table-td server-list__table-td--mode">{{ server.mode }}</td>
                                        <td class="server-list__table-td server-list__table-td--nr">{{ server.players }} / {{server.slots}}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                    <div class="server-list__no-servers-found" v-else>
                        <p>{{ noServersMessage }}</p>
                    </div>
                </template>
                <div class="server-list__btn-container" v-if="serverList || hasError">
                    <button class="server-list__btn server-list__btn--refresh" @click="handleRefreshBtnClick">
                        Refresh
                    </button>
                </div>
            </div>
        `,
        data() {
            return {
                isLoading: true,
                hasError: false,
                loadingMessage: 'Loading',
                errorMessage: 'Server list could not be loaded',
                noServersMessage: 'No servers found',
                autoRefreshIntervalId: null,
                data: null
            };
        },
        computed: {
            formattedTimestamp() {
                if (!this.data || !this.data.Timestamp) {
                    return null;
                }
                
                return new Date(this.data.Timestamp).toLocaleString();
            },
            serverList() {
                if (!this.data || !this.data.Servers) {
                    return null;
                }

                const serverList = [];

                const cleanServerName = function (serverName) {
                    return utils.addWordBreakOpportunities(
                        utils.escapeHtml(serverName)
                    );
                };

                // add servers of the serverGroups to the serverList
                this.data.Servers.forEach(function (serverGroup) {
                    serverGroup.forEach(function (server) {
                        const serverObj = {
                            id: server.Id,
                            name: server.Name,
                            cleanName: cleanServerName(server.Name),
                            level: config.levelNames[server.Level] || config.defaultLevelName,
                            mode: config.modeNames[server.Mode] || config.defaultModeName,
                            players: server.Players,
                            slots: server.Slots
                        };

                        serverList.push(serverObj);
                    });
                });

                // sort list by server names
                serverList.sort(function (serverA, serverB) {
                    return serverA.name.localeCompare(serverB.name);
                });

                return serverList;
            },
        },
        methods: {
            loadServerList(timeout) {
                var _this = this;
                
                timeout = timeout || 0;
                _this.isLoading = true;

                setTimeout(function () {
                    axios.get(config.serverListApiUrl)
                    .then(function (response) {
                        var responseData = response.data;

                        _this.hasError = false;

                        if (responseData.IsLoading) {
                            // server is currently busy collecting the server list
                            // so send a new request after a short timeout
                            _this.loadServerList(1000);
                        } else {
                            _this.isLoading = false;
                            _this.data = responseData;
                        }
                    })
                    .catch(function (error) {
                        _this.isLoading = false;
                        _this.hasError = true;
                        console.error('Failed to load server list', error);
                    });
                }, timeout);
            },
            handleRefreshBtnClick() {
                this.clearAutoRefreshInterval();
                this.data = null;
                this.loadServerList(500);
                this.startAutoRefreshInterval();
            },
            startAutoRefreshInterval() {
                var _this = this;

                _this.autoRefreshIntervalId = setInterval(function () {
                    _this.loadServerList();
                }, 10000);
            },
            clearAutoRefreshInterval() {
                if (!this.autoRefreshIntervalId) {
                    return;
                }

                clearInterval(this.autoRefreshIntervalId);
                this.autoRefreshIntervalId = null;
            }
        },
        mounted () {
            this.loadServerList();
            this.startAutoRefreshInterval();
        },
    });

    new Vue({
        el: '#server-list-app'
    });
})();