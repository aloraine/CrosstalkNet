'use strict';

controllers.controller('MainController', ['$scope',
    '$rootScope', 'RESTService',
    'GraphConfigService', 'BasicDataService', 'ExportService', 'FileUploadService', 'InitializationService', 'ValidationService', '$q', '$timeout', '$cookies',
    '$mdDialog',
    function($scope, $rootScope, RESTService, GraphConfigService, BasicDataService, ExportService, FileUploadService, InitializationService, ValidationService,
        $q, $timeout, $cookies, $mdDialog) {
        $rootScope.selectedTab = 0;
        $rootScope.correlationFilesDisplayed = { nonDelta: null, delta: null };
        $rootScope.correlationFilesActual = { nonDelta: null, delta: null };
        $rootScope.geneLists = { nonDelta: null, delta: null };
        $rootScope.states = angular.copy(BasicDataService.states);
        $rootScope.state = $rootScope.states.initial;

        $scope.ctrl = "main";
        InitializationService.initializeCommonVariables($scope);
        $scope.getAllVisibleGenes = GraphConfigService.getAllVisibleGenes;
        $scope.closeEdgeInspector = GraphConfigService.closeEdgeInspector;
        $scope.uploadFiles = FileUploadService.uploadFiles;
        $scope.config = null;
        $scope.needsRedraw = false;
        $scope.tabIndex = 0;

        $scope.exportNeighboursToCSV = ExportService.exportNeighboursToCSV;
        $scope.exportGraphToPNG = ExportService.exportGraphToPNG;

        $rootScope.tokenSet = false;
        $scope.user = { name: null, password: null, token: null };

        $scope.init = function(whichController) {
            $scope.whichController = whichController;
        };

        $scope.changeDisplay = function() {
            if ($scope.display == "Graph") {
                $scope.display = "Tables";
            } else {
                $scope.display = "Graph";
            }
        };

        $scope.resetInputFields = function() {
            $("md-autocomplete input").each(function() {
                $(this).val('');
            });
        };

        $scope.addGeneOfInterest = function(gene) {
            if (gene != null) {
                if ($scope.genesOfInterest.indexOf(gene) < 0) {
                    $scope.genesOfInterest.push(gene);
                }
            }
        };

        $scope.locateGene = function(gene) {
            if (gene != null && gene != '') {
                $scope.findGeneInGraph($scope, gene);
            }
        };

        $scope.clearLocatedGene = function() {
            GraphConfigService.clearLocatedGene($scope);
        }

        $scope.removeGenesOfInterest = function() {
            $scope.genesOfInterest = [];
            $scope.resetInputFields();
            $scope.resetFilters();
            if ($scope.cy) {
                $scope.cy.destroy();
            }
        };

        $scope.getRelevantGenes = function(filter) {
            var filterFirst = false;
            var filterSecond = false;
            var depth = 1;
            $rootScope.state = $rootScope.states.loadingGraph;

            if ($scope.GOIState == $scope.GOIStates.filterFirst) {
                if (filter == false) {
                    depth = 2;
                }
                filter = true;
                filterFirst = $scope.correlationFilterFirst.negativeEnabled || $scope.correlationFilterFirst.positiveEnabled;
            } else if ($scope.GOIState == $scope.GOIStates.getSecondNeighbours) {
                filterFirst = $scope.correlationFilterFirst.negativeEnabled || $scope.correlationFilterFirst.positiveEnabled;
                filterSecond = $scope.correlationFilterSecond.negativeEnabled || $scope.correlationFilterSecond.positiveEnabled;
                depth = 2;
            } else if ($scope.GOIState == $scope.GOIStates.filterSecond) {
                filterFirst = $scope.correlationFilterFirst.negativeEnabled || $scope.correlationFilterFirst.positiveEnabled;
                filterSecond = $scope.correlationFilterSecond.negativeEnabled || $scope.correlationFilterSecond.positiveEnabled;
                depth = 2;
            }

            RESTService.post("submatrix", {
                    selectedGenes: $scope.genesOfInterest,
                    minNegativeWeightFirst: $scope.correlationFilterFirst.negativeFilter ==
                        null || !$scope.correlationFilterFirst.negativeEnabled ?
                        "NA" : $scope.correlationFilterFirst.negativeFilter,
                    minPositiveWeightFirst: $scope.correlationFilterFirst.positiveFilter ==
                        null || !$scope.correlationFilterFirst.positiveEnabled ?
                        "NA" : $scope.correlationFilterFirst.positiveFilter,
                    minNegativeWeightSecond: $scope.correlationFilterSecond.negativeFilter ==
                        null || !$scope.correlationFilterSecond.negativeEnabled ?
                        "NA" : $scope.correlationFilterSecond.negativeFilter,
                    minPositiveWeightSecond: $scope.correlationFilterSecond.positiveFilter ==
                        null || !$scope.correlationFilterSecond.positiveEnabled ?
                        "NA" : $scope.correlationFilterSecond.positiveFilter,
                    selectedFilterFirst: { negative: $scope.correlationFilterFirst.negativeEnabled, positive: $scope.correlationFilterFirst.positiveEnabled },
                    selectedFilterSecond: { negative: $scope.correlationFilterSecond.negativeEnabled, positive: $scope.correlationFilterSecond.positiveEnabled },
                    filterFirst: filterFirst && filter,
                    filterSecond: filterSecond && filter,
                    layout: $scope.selectedLayout,
                    depth: depth,
                    fileName: $rootScope.correlationFilesActual[$scope.whichController]
                })
                .then(function(data) {
                    if (!ValidationService.checkServerResponse(data)) {
                        return;
                    }

                    console.log(data);
                    $rootScope.state = $rootScope.states.loadingConfig;
                    $scope.totalInteractions = data.totalInteractions;
                    $scope.firstNeighbourInteractions = data.firstNeighbourInteractions;
                    $scope.secondNeighbourInteractions = data.secondNeighbourInteractions;
                    if ($scope.display == "Tables") {
                        $scope.needsRedraw = true;
                    }
                    $scope.applyConfig(data.config, "cyMain" + $scope.whichController, $scope);

                    $scope.edgeDictionary = data.edgeDictionary;
                    $scope.selfLoops = data.selfLoops;
                    $scope.allVisibleGenes = $scope.getAllVisibleGenes($scope);
                    $rootScope.state = $rootScope.states.showingGraph;

                    if ($scope.GOIState == $scope.GOIStates.initial) {
                        $scope.correlationFilterFirst.min = data.minNegativeWeight;
                        $scope.correlationFilterFirst.max = data.maxPositiveWeight;
                        $scope.GOIState = $scope.GOIStates.filterFirst;
                    } else if ($scope.GOIState == $scope.GOIStates.filterFirst && depth == 2) {
                        $scope.correlationFilterSecond.min = data.minNegativeWeight;
                        $scope.correlationFilterSecond.max = data.maxPositiveWeight;
                        $scope.GOIState = $scope.GOIStates.getSecondNeighbours;
                    } else if ($scope.GOIState == $scope.GOIStates.getSecondNeighbours) {
                        $scope.GOIState = $scope.GOIStates.filterSecond;
                    }

                    $scope.setNeighboursGeneral($scope, depth, false);
                });
        };

        $scope.removeGene = function(gene) {
            $scope.genesOfInterest.splice($scope.genesOfInterest.indexOf(gene), 1);
        };

        $scope.getGeneList = function() {
            $rootScope.state = $rootScope.states.gettingGeneList;
            RESTService.post('gene-list', { fileName: $rootScope.correlationFilesActual[$scope.whichController] })
                .then(function(data) {
                    if (!ValidationService.checkServerResponse(data)) {
                        return;
                    }

                    $rootScope.geneList = data.geneList;
                    $rootScope.state = $rootScope.states.initial;
                });
        };

        $scope.getFileList = function() {
            RESTService.post('available-matrices', {})
                .then(function(data) {
                    if (!ValidationService.checkServerResponse(data)) {
                        return;
                    }

                    $scope.fileList = data.fileList;
                });
        };

        $scope.getOverallMatrixStats = function() {
            RESTService.post('overall-matrix-stats', { fileName: $rootScope.correlationFilesActual[$scope.whichController] }).then(function(data) {
                if (!ValidationService.checkServerResponse(data)) {
                    return;
                }

                $scope.overallMatrixStats = data.overallMatrixStats;
                console.log(data);
            });
        };

        $scope.resetGeneSelection = function() {
            $scope.GOIState = $scope.GOIStates.initial;
            $scope.resetFilters();
        };

        $scope.resetFilters = function() {
            $scope.correlationFilterFirst = angular.copy($scope.correlationFilterModel);
            $scope.correlationFilterSecond = angular.copy($scope.correlationFilterModel);
        };

        $scope.getInteraction = function(source, target) {
            var edge = null;

            edge = $scope.cy.filter(function(i, element) {
                if (element.isEdge() && ((element.source().id() == source.id() && element.target().id() == target.id()) ||
                        (element.target().id() == source.id() && element.source().id() == target.id()))) {
                    return true;
                }

                return false
            });

            return edge.length == 0 ? 0 : edge.data('weight');
        };

        $scope.getInteractionViaDictionary = function(source, target) {
            if ($scope.edgeDictionary[source] != null && $scope.edgeDictionary[source][target] != null) {
                return $scope.edgeDictionary[source][target];
            } else {
                return 0;
            }
        };

        $scope.refreshGeneList = function() {
            $rootScope.correlationFilesActual[$scope.whichController] = $rootScope.correlationFilesDisplayed[$scope.whichController];
            $scope.removeGenesOfInterest();
            $scope.resetInputFields();
            $scope.resetFilters();
            $scope.overallMatrixStats = null;
            $scope.GOIState = $scope.GOIStates.initial;
            $scope.allVisibleGenes = [];
            $scope.getGeneList();
            $scope.getOverallMatrixStats();
            $scope.tabIndex = 1;
            if ($scope.cy) {
                $scope.cy.destroy();
            }
            $scope.cy = null;
        };

        $scope.returnToFirstNeighboursFilter = function() {
            $scope.GOIState = $scope.GOIStates.filterFirst;
            $scope.correlationFilterSecond = angular.copy($scope.correlationFilterModel);
        };

        $scope.$watch('display', function(newValue, oldValue) {
            if (newValue == 'Graph') {
                $timeout(function() {
                    if ($scope.config != null) {
                        $scope.cy.resize();
                        $scope.needsRedraw = false;
                        $scope.applyConfig($scope.config, "cyMain", $scope);
                    }
                }, 250);

            }
        });

        $rootScope.$watch('tokenSet', function(newValue, oldValue) {
            if (newValue == false && oldValue == true) {
                $cookies.remove('token');
                $scope.showLoginDialog();
            }
        });

        $scope.checkToken = function() {
            if ($cookies.get('token') != null && $cookies.get('token') != 'null') {
                $rootScope.tokenSet = true;
                $scope.login();
            } else {
                $scope.showLoginDialog();
            }
        };

        $scope.showLoginDialog = function(ev) {
            $mdDialog.show({
                    controller: function() { this.parent = $scope; },
                    controllerAs: 'ctrl',
                    templateUrl: '../../partials/dialogs/loginDialog.html',
                    parent: angular.element(document.body),
                    clickOutsideToClose: false,
                    fullscreen: false,
                    targetEvent: ev
                })
                .then(function(answer) {

                }, function() {

                });
        };

        $scope.login = function() {
            RESTService.post('login', { user: $scope.user })
                .then(function(data) {
                    $scope.user = { name: null, password: null, token: null };
                    if (!ValidationService.checkServerResponse(data)) {
                        return;
                    } else {
                        var now = new Date();
                        var exp = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

                        $rootScope.tokenSet = true;
                        if (data.token != null) {
                            $cookies.put('token', data.token, { expires: exp });
                        }
                        $scope.getFileList();
                        $mdDialog.hide('');
                    }
                });
        };

        $scope.answer = function(answer) {
            $mdDialog.hide(answer);
        };

        if ($scope.whichController == 'nonDelta') {
            $scope.checkToken();
        }
    }
]);
