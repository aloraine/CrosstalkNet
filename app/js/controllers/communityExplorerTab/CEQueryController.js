'use strict';
/**
 * Controller for the QUERY sub-tab COMMUNITY EXPLORER tab.
 * @namespace controllers
 */
(function() {
    angular.module('myApp.controllers').controller('CEQueryController', [
        '$scope',
        '$rootScope',
        'GlobalSharedData', 'QueryService', 'CESharedData', 'GraphConfigService', 'FileUploadService',
        CEQueryController
    ]);

    /**
     * @namespace CEQueryController
     * @desc Controller for the QUERY sub-tab in the COMMUNITY EXPLORER tab.
     * @memberOf controllers
     */
    function CEQueryController($scope, $rootScope, GlobalSharedData, QueryService, CESharedData, GraphConfigService,
        FileUploadService) {
        var vm = this;

        vm.sharedData = GlobalSharedData.data;


        vm.getCommunities = getCommunities;
        vm.initializeController = initializeController;
        vm.uploadFile = uploadFile;

        /**
         * @summary Assigns the ctrl property of the controller and sets the appropriate within 
         * tab model based on the ctrl property.
         *
         * @param {String} ctrl A name to associate this controller with.
         * @memberOf controllers.CEQueryController
         */
        function initializeController(ctrl) {
            vm.ctrl = ctrl;
            vm.sdWithinTab = CESharedData.data;
            initializeVariables();
        }

        /**
         * @summary Initializes variables used within the tab for binding to the controls.
         *
         * @memberOf controllers.CEQueryController
         */
        function initializeVariables() {
            vm.communityFile = null;
            vm.communityUpload = null;
            loadFileList();
        }

        /**
         * @summary Obtains a cytoscape.js config from the server for 
         * the given communities file.
         *
         * @memberOf controllers.CEQueryController
         */
        function getCommunities(filterType) {
            var file = JSON.parse(vm.communityFile);
            $rootScope.state = $rootScope.states.loadingGraph;
            CESharedData.resetWTM(vm);
            QueryService.getCommunities(file).then(function(result) {
                $rootScope.state = $rootScope.states.finishedGettingCommunities;

                if (result.config == null) {
                    return;
                }

                $rootScope.state = $rootScope.states.loadingConfig;

                vm.sdWithinTab.cy = GraphConfigService.applyConfigCommunities(vm, result.config, "cyCommunityExplorer");

                $rootScope.state = $rootScope.states.showingConfig;

                vm.sdWithinTab.communities = result.communities;
                vm.sdWithinTab.dataLoaded = true;
            });
        }

        function loadFileList() {
            QueryService.getCommunityFileList().then(function(result) {
                vm.fileList = result.fileList;
            });
        }

        function uploadFile() {
            $rootScope.state = $rootScope.states.uploadingFile;
            FileUploadService.uploadCommunityFile(vm.communityUpload).then(function() {
                $rootScope.state = $rootScope.states.initial;
                vm.clearAllData = true;
            });
        }

        /**
         * @summary Spawns a confirm dialog asking the user if they really want to 
         * delete the file they clicked on.
         *
         * @param {Event} ev The event associated with the click. This is used to prevent
         * propogation.
         * @param {Object} file The file that is to be deleted.
         * @memberOf controllers.CEQueryController
         */
        function deleteConfirm(ev, file) {
            var toDelete = {};

            for (var prop in file) {
                if (prop.indexOf("$") < 0) {
                    toDelete[prop] = file[prop];
                }
            }

            ev.stopPropagation();
            $mdSelect.hide();

            var confirm = $mdDialog.confirm()
                .title('Confirm Delete?')
                .textContent('Are you sure you want to delete the file: ' + file.name + '?')
                .ariaLabel('Lucky day')
                .targetEvent(ev)
                .clickOutsideToClose(false)
                .escapeToClose(false)
                .ok('Yes')
                .cancel('No');
            $mdDialog.show(confirm).then(function() {
                QueryService.deleteCommunityFile(toDelete);
            }, function() {});

            GlobalControls.focusElement("md-dialog button.ng-enter-active");
        }


        /**
         * @summary Wacthes for changes in the reloadFileList variable and reloads the available
         * file dropdowns as well as the user permission level when reloadFileList becomes true.
         * @memberOf controllers.CEQueryController
         */
        $scope.$watch(function() {
            return vm.sharedData.reloadFileList;
        }, function(newValue, oldValue) {
            if (newValue == true) {
                loadFileList();
                loadPermission();
            }
        });

        /**
         * @summary Watches the clearAllData variable and clears the data within the tab when 
         * it changes to true.
         *
         * @memberOf controllers.CEQueryController
         */
        $scope.$watch(function() {
            return vm.sharedData.clearAllData;
        }, function(newValue, oldValue) {
            if (newValue == true && newValue != oldValue) {
                CESharedData.resetWTM(vm);
                initializeVariables();
            }
        });
    }
})();
