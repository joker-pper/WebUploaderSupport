"use strict";
//https://github.com/joker-pper/WebUploaderSupport.git
/**
 * @param options key：support 自定义拓展属性（可以重写对应的属性,删除文件的逻辑可以重新进行实现.）, 其他配置参考webuploader配置,优先级理论大于support的配置
 */
function WebUploaderSupport(options) {
    //当前实例
    var webUploaderSupportInstance = this;

    var fileStatus =  {
        inited: "inited",  //初始状态
        queued: "queued",  //已经进入队列, 等待上传
        progress: "progress",  //上传中
        complete: "complete",  //上传完成
        error: "error",  //上传出错，可重试
        interrupt: "interrupt",  //上传中断，可续传
        invalid: "invalid",  //文件不合格，不能重试上传。会自动从队列中移除
        cancelled: "cancelled"  //文件被移除
    };
    WebUploaderSupport.fileStatus = fileStatus;

    var $fns = {
        log: function (content) {
            if(support.log && console) {
                console.log(content);
            }
        },
        logInfo: function () {
            var support = webUploaderSupportInstance.support;
            if(!support) {
                this.log("WebUploader does not support the browser you are using.");
            } else {
                if(this.getUploader() == null) {
                    this.log("WebUploader has not inited, please use it after inited.");
                }
            }
        },
        logWarn: function (content) {
            if(console) {
                console.warn(content);
            }
        },
        getUploader: function () {
            var uploader = webUploaderSupportInstance.uploader;
            return uploader;
        },
        getFiles: function () {
            var result = null;
            var uploader = this.getUploader();
            if(uploader) {
                result = uploader.getFiles();
            }
            return result;
        },
        getFileSize: function (status) {
            var result = 0;
            var uploader = this.getUploader();
            if(uploader) {
                if(status != null) {
                    result = uploader.getFiles(status).length;
                } else {
                    result = uploader.getFiles().length;
                }

            }
            return result;
        },
        getInitedFileSize: function () { //获取inited状态的文件个数
            return this.getFileSize('inited');
        },
        retry: function (file) {
            var uploader = this.getUploader();
            if(uploader) {
                if(support.edit) {
                    if(file != null) {
                        uploader.retry(file);
                    } else {
                        uploader.retry();
                    }
                } else {
                    this.log("can't retry, because not in edit mode");
                }
            }
            this.logInfo();
        },
        upload: function () {
            var uploader = this.getUploader();
            if(uploader) {
                if(support.edit) {
                    uploader.upload();
                } else {
                    this.log("can't upload, because not in edit mode");
                }
            }
            this.logInfo();
        },
        removeFileWithItem: function (file) {
            var uploader = webUploaderSupportInstance.uploader;
            if(file) {
                support.removeFileItem(support.getItem(file));
                if(uploader) {
                    uploader.removeFile(file.id, true);
                }
            }

        }
    };
    webUploaderSupportInstance.$fns = $fns;

    options = options || {};


    var support = {
        $fns: {},  //公共函数
        $elements: {},  //区域jquery元素
        edit: true,
        uploader: ".uploader",  //上传区域容器选择器
        dndWrapper: ".wrapper",  //拖拽区域选择器
        chooseFileBtn: ".filePicker",  //选择文件的按钮选择器
        uploadFileBtn: ".uploadFile",  //上传文件的按钮选择器
        fileList: ".file-list",  //显示文件列表的区域选择器
        log: false,    //是否打印信息
        multiple: true,  //默认多选
        fileSize: -1,  //文件总个数, -1时无限制
        thumbnailWidth: 150,
        thumbnailHeight: 150,
        fileListMinHeight: 100, //fileList默认最小高度
        serverFiles: [],  //加载服务端的数据,当前为 [{name:string, src: string, attrs: {}}]
        serverFileAttrName: "data-server-file",  //服务端文件的属性名称
        deleteServerFileAttrName: "data-delete-url",
        /**
         * 获取fileListMinHeight时是否依据thumbnail的值
         */
        fileListMinHeightWithThumbnail: true,
        /**
         * 获取file list最小高度值
         * @returns {number}
         */
        getFileListMinHeight: function() {
            var self = this;
            if (self.fileListMinHeightWithThumbnail) {
                return this.thumbnailHeight + 20;
            }
            return this.fileListMinHeight;
        },
        instance: null, //uploader实例
        ratio: (function () {
            return window.devicePixelRatio || 1;  //优化retina, 在retina下这个值是2
        })(),
        getActualThumbnailWidth: function () {
            var self = this;
            var ratio = self.ratio;
            return self.thumbnailWidth * ratio;
        },
        getActualThumbnailHeight: function () {
            var self = this;
            var ratio = self.ratio;
            return self.thumbnailHeight * ratio;
        },
        /**
         * 处理文件的预览效果
         * @param isFile 是否为file对象
         * @param data
         * @returns {*}
         */
        renderItem: function (isFile, data) {
            var name = data.name || "";
            var html =
                '<div class="file-item thumbnail">' +
                '<div class="file-info">' + name + '</div>' +
                '<div class="file-operations">' +
                '<div class="file-delete">' + '<button type="button">' + '删除</button></div>' +
                '<div class="file-retry">' + '<button type="button">' + '重试</button></div>' +
                '</div>' +
                '<div class="progress">' +
                '<div class="progress-bar"></div>' +
                '</div>' +
                '</div>';
            var $item = $(html);

            if (!isFile) {
                //服务端显示数据时
                var $preview;  //根据文件后缀进行展示预览结果
                if(/(.jpg|.png|.gif|.bmp|.jpeg)$/.test(name.toLocaleLowerCase())) {
                    $preview = $('<img src="'+ data.src + '"/>');
                } else {
                    $preview = this.getThumbErrorPreview(data.name, this.thumbnailHeight, this.thumbnailWidth);
                }
                $item.append($preview);
                this.setItemStyle($item);  //以缩略图大小设置$item宽高
            } else {
                $item.attr("id", data.id);
                $item.append('<div class="state ready">等待上传...</div>');
                this.showPreview($item, data);  //显示预览效果
            }
            return $item[0];
        },
        /**
         * 获取不能预览的文件的样式,可覆盖(可根据名称解析后返回img对象显示)
         * @param name 文件名
         * @param thumbnailHeight
         * @param thumbnailWidth
         * @returns {jQuery}
         */
        getThumbErrorPreview: function (name, thumbnailHeight, thumbnailWidth) {
            var $element = $('<div class="preview"></div>').css({
                height: thumbnailHeight,
                width: thumbnailWidth
            }).append($('<div class="preview-tips">不能预览</div>'));
            return $element;

            //显示图片的方式
            //return $('<img src="../images/preview/1.jpg">');

        },
        showPreview: function ($item, file) {   //显示文件中的预览效果
            var $preview = $('<img />');
            $item.append($preview);
            var uploader = this.instance;
            // 缩略图大小
            var thumbnailWidth = this.getActualThumbnailWidth(), thumbnailHeight = this.getActualThumbnailHeight();
            this.setItemStyle($item);  //设置item宽高
            var self = this;
            uploader.makeThumb(file, function (error, src) {
                if (error) {
                    $preview.replaceWith(self.getThumbErrorPreview(file.name, self.thumbnailHeight, self.thumbnailWidth));
                    return;
                }
                $preview.attr('src', src);

            }, thumbnailWidth, thumbnailHeight);
        },
        getItem: function (file) {  //获取$item
            return $("#" + file.id);
        },
        setItemStyle: function ($item) {  //设置缩略图所在容器的宽高,默认是均150px,用于加载文件预览时设置
            if($item) {
                var self = this;
                var thumbnailWidth = self.thumbnailWidth, thumbnailHeight = self.thumbnailHeight;
                $item.css({width: thumbnailWidth, height: thumbnailHeight});  //设置$item宽高
            }
        },
        loadUploadFileBtnStyle: function () {  //用于加载上传按钮的样式
            var $fns = this.$fns;
            var $uploadFileBtn = this.$elements.$uploadFileBtn;
            if($fns && $uploadFileBtn) {
                var initedSize = $fns.getInitedFileSize();
                if (initedSize === 0) {  //inited 文件个数
                    $uploadFileBtn.addClass("disabled"); //上传按钮禁用
                } else {
                    $uploadFileBtn.removeClass("disabled");  //移除上传按钮的禁用样式
                }
            }
        },
        retryFile: function ($item, file) {
            var $fns = this.$fns;
            $fns.retry(file);
        },
        //移除$item
        removeFileItem: function($item) {
            if($item && $item[0]) {
                $item.off().remove();
            }
        },
        //移除$item和file
        removeFileWithItem: function (file) {
            var $fns = this.$fns;
            $fns.removeFileWithItem(file);
        },
        getIsServerFile: function ($item) {  //判断文件是否是服务端文件
            var val = $item && $item.attr(this.serverFileAttrName);
            if(val && val === "true") {
                return true;
            }
            return false;
        },
        getServerFileSize: function () {  //获取服务端文件的个数
            var $fileList = this.$elements.$fileList;
            var size = 0;
            var serverFileAttrName = this.serverFileAttrName;
            if($fileList) {
                size = $fileList.find(".file-item["+serverFileAttrName+"='true']").size();
            }
            return size;
        },
        getItemSize: function () {  //获取当前item的文件个数
            var $fileList = this.$elements.$fileList;
            var size = 0;
            if($fileList) {
                size = $fileList.find(".file-item").size();
            }
            return size;
        },
        getCurrentFileSize: function () {  //获取当前uploader实例中文件的个数
            var fileStatus = WebUploaderSupport.fileStatus;
            var $fns = this.$fns;
            var initedSize = $fns.getFileSize(fileStatus.inited);  //初始状态个数
            var errorSize = $fns.getFileSize(fileStatus.error);  //上传失败个数
            var size = initedSize + errorSize + this.getServerFileSize();//最终加上服务端文件个数
            var itemSize = this.getItemSize();
            var result = itemSize > size ? itemSize : size;
            return result;
        },
        /**
         * 删除文件的处理逻辑，包含服务端
         * @param $item
         * @param file
         */
        deleteFile: function ($item, file) {
            if(this.getIsServerFile($item)) {  //服务端时
                if(this.edit) {
                    this.deleteServerFileCore($item, this.deleteServerFileCallback);
                } else {
                    this.$fns.log("can't delete server file");
                }
            } else {
                if(this.removeFileWithItem && file) {
                    this.removeFileWithItem(file);
                }
                this.loadChooseFileBtnStyle();
            }
        },
        deleteServerFileCore: function ($item, deleteServerFileCallback) {
            var self = this;
            //获取删除的url
            var url = $item && $item.attr(self.deleteServerFileAttrName);

            var exist = deleteServerFileCallback && typeof deleteServerFileCallback === "function";

            if (!exist) {
                self.$fns.log("webuploader support instance not has delete server file callback function.");
            }

            var hasUrl = url != null && url != "";

            if (!hasUrl) {
                var name = $item && $item.find(".file-info").html() || "";
                self.$fns.log("webuploader support instance not found " + name + " delete server url.");
            }
            if (hasUrl && exist) {
                //存在函数和url时操作
                self.deleteServerFile($item, url, deleteServerFileCallback);
            }
        },
        /**
         * 删除服务端文件(依赖于getIsServerFile的判断结果)的业务操作,可根据实际覆盖重写(support配置中直接重写该函数即可)
         * @param $item
         * @param deleteServerFileCallback
         */
        deleteServerFile: function($item, url, deleteServerFileCallback) {
            var self = this;
            $.ajax({
                dataType: "json",
                type: "post",
                url: url,
                success: function (json) {
                    deleteServerFileCallback(self, $item, json);  //通过callback执行业务操作
                    //文件操作完成后重新加载选择按钮样式
                    self.loadChooseFileBtnStyle();
                }
            });
        },
        /**
         * deleteServerFile 响应成功时的回调处理,可根据实际覆盖重写
         * @param self 当前support对象,用于访问其他对象及函数
         * @param $item
         * @param data
         */
        deleteServerFileCallback: function (self, $item, data) {
            if(data.status) {
                self.removeFileItem($item);
            } else {
                alert(data.content);
            }
        },
        init: function (data, $fileList) { //初始化服务端数据,及加载样式

            var self = this;
            var edit = self.edit;
            var $files = null;

            //加载服务端数据
            if(data && data.length > 0) {
                for(var i in data) {
                    var item = data[i];
                    var $item = $(this.renderItem(false, item));

                    if(!edit) {
                        $item.addClass("not-edit");
                    }

                    if($item && item) {
                        var attrs = item.attrs;
                        for(var key in attrs) {  //设置$item属性值
                            $item.attr(key, attrs[key]);
                        }
                    }
                    if(i === "0") {
                        $files = $item;
                    } else {
                        $files = $files.add($item);
                    }
                }
            }
            if($files) { //加载服务端数据
                $fileList.append($files);
                $files.on('click', '.file-delete button', function () {
                    var $item = $(this).parents(".file-item");
                    self.deleteFile($item);
                });
            }

            self.loadChooseFileBtnStyle();
        },
        editChange: function (edit) {  //用于根据edit改变时进行设置webuploader模式
            var self = this;
            self.edit = edit;

            var $fileList = self.$elements.$fileList;
            if(edit) {
                $fileList.children().removeClass("not-edit");
            } else {
                $fileList.children().addClass("not-edit");
            }
            self.loadChooseFileBtnStyle();
        },
        getChooseFileLabel: function ($chooseFileBtn) {  //获取当前上传文件按钮对应的label,该label用于触发选择文件
            var $label = null;
            if($chooseFileBtn) {
                if($chooseFileBtn.hasClass("webuploader-container")) {
                    $label = $chooseFileBtn.find(".webuploader-element-invisible").next("label");
                } else {
                    $label = $(".webuploader-container").not(this.chooseFileBtn).find(".webuploader-element-invisible").next("label");
                }
            }
            return $label;
        },
        loadChooseFileBtnStyle: function () {  //根据文件个数进行展示选择文件的按钮(用于上传完成时,删除文件时，添加到队列时， 初次加载服务端数据时)
            var self = this;

            var $uploadFileBtn = self.$elements.$uploadFileBtn;
            var $chooseFileBtn = self.$elements.$chooseFileBtn;

            var $fns = self.$fns;
            var fileSize = self.fileSize;
            var $actions = $chooseFileBtn.parents(".actions");
            var $actionsArea = $actions.parent(".actions-area");
            var $label = self.getChooseFileLabel($chooseFileBtn);

            if (self.edit) {  //可编辑时
                $actionsArea.css("height", "");
                $actions.show();
                var uploader = $fns.getUploader();
                if(uploader) {
                    uploader.refresh();  //解决label按钮点击无反应
                }
                if (fileSize > 0) {
                    var currentSize = self.getCurrentFileSize();
                    if (fileSize === currentSize) {
                        $label && $label.hide();
                        $chooseFileBtn.hide();
                        $uploadFileBtn.addClass("right");
                    } else {
                        $label && $label.show();
                        $chooseFileBtn.show();
                        $uploadFileBtn.removeClass("right");
                    }
                } else {
                    $label && $label.show();
                    $chooseFileBtn.show();
                    $uploadFileBtn.removeClass("right");
                }
            } else {  //不可编辑时

                $actions.hide();
                $actionsArea.css("height", 10);

                if ($label) {
                    $label.hide();
                }
            }
        },

        // <---   处理事件  --->
        // https://fex.baidu.com/webuploader/doc/index.html#WebUploader_Uploader_events

        /**
         * 当文件被加入队列之前触发,若返回false则此文件不会被添加进入队列
         * @param file
         * @returns {boolean} 为true时可以添加到webuploader中并进行显示
         */
        beforeFileQueued: function(file) {
            var fileSize = this.fileSize; //获取当前总个数
            if(fileSize < 1) {  //无限制个数
                return true;
            }
            var currentFileSize = this.getCurrentFileSize();  //当前总个数
            var flag = false;
            var edit = this.edit;
            if(edit) {  //可编辑模式时
                if(currentFileSize < fileSize) {
                    flag = true;
                }
            }
            //执行beforeFileQueuedCallback回调函数
            this.beforeFileQueuedCallback(edit, flag, file, fileSize, currentFileSize);
            return flag;
        },

        /**
         * 当文件被加入队列以后触发
         * @param file
         */
        fileQueued: function (file) {  //文件被添加进队列
            var self = this;
            var $item = $(this.renderItem(true, file));
            var $fileList = this.$elements.$fileList;
            $fileList.append($item);  //显示在文件列表中
            self.loadUploadFileBtnStyle();  //加载上传按钮样式
            $item.on("click", 'button', function () {
                var $this = $(this);
                if($this.parents(".file-retry")[0]) {
                    self.retryFile($item, file);
                } else if ($this.parents(".file-delete")[0]) {
                    self.deleteFile($item, file);
                }
            });
            self.loadChooseFileBtnStyle();
        },

        /**
         * 当文件被移除队列后触发
         * @param file
         */
        fileDequeued: function (file) {
            this.loadUploadFileBtnStyle();
        },

        /**
         * 当某个文件的分块在发送前触发,主要用来询问是否要添加附带参数,大文件在开起分片上传的前提下此事件可能会触发多次
         * @param block
         * @param data 默认的上传参数,可以扩展此对象来控制上传参数
         * @param headers 可以扩展此对象来控制上传头部
         */
        uploadBeforeSend: function (block, data, headers) {

        },

        /**
         * 上传过程中触发,携带上传进度
         * @param file
         * @param percentage 上传进度
         */
        uploadProgress: function (file, percentage) {  //文件上传过程中创建进度条
            var $item = this.getItem(file);
            $item.find('.file-delete, .preview-tips').addClass("uploading");  //隐藏删除按钮、提示文字
            $item.removeClass("retry");  //移除重试class
            $item.find('.progress').show();  //显示进度条
            var $percent = $item.find('.progress .progress-bar');
            $percent.css('width', percentage * 100 + '%');
        },

        /**
         * 不管成功或者失败,文件上传完成时触发
         * @param file
         */
        uploadComplete: function (file) {  //完成上传时，无论成功或者失败
            var $item = this.getItem(file);
            $item.find('.progress').fadeOut();
            $item.find('.file-delete, .preview-tips').removeClass("uploading");  //显示删除按钮、提示文字

            this.loadChooseFileBtnStyle();
            this.loadUploadFileBtnStyle();
        },

        /**
         * 文件上传完成后的处理
         * @param file
         * @param data
         */
        uploadSuccess: function (file, data) {
            var $item = this.getItem(file),
                $state = $item.find('.state');
            $item.find('.progress').hide();
            if (data.status) {  //上传成功时
                this.uploadSuccessCallback($item, data);  //用于标识为服务端文件
                if (!$state.hasClass('success')) {
                    $state.attr("class", "state success");
                    $state.text('上传成功');
                }
                $item.removeClass("retry");
            } else {
                if (!$state.hasClass('error')) {
                    $state.attr("class", "state error");
                    $state.text('上传失败');
                }
                $item.addClass("retry");
            }
        },

        /**
         * 当所有文件上传结束时触发
         */
        uploadFinished: function () {

        },

        /**
         * 当validate不通过时触发(对应error事件)
         * @param type
         *       Q_EXCEED_SIZE_LIMIT 在设置了Q_EXCEED_SIZE_LIMIT且尝试给uploader添加的文件总大小超出这个值时
         *       Q_TYPE_DENIED 当文件类型不满足时
         *       Q_EXCEED_NUM_LIMIT 在设置了fileNumLimit且尝试给uploader添加的文件数量超出这个值时
         */
        errorTypeHandler: function (type, file) {

        },

        /**
         * 当文件上传出错时触发
         * @param file
         */
        uploadError: function (file) {  //文件上传失败后
            var $item = this.getItem(file),
                $state = $item.find('.state');
            if (!$state.hasClass('error')) {
                $state.attr("class", "state error");
                $state.text('上传失败');
            }
            $item.addClass("retry");
            this.loadUploadFileBtnStyle();

            this.uploadErrorAfter(file);
        },

        /**
         * 当文件被加入队列返回结果之前触发
         * @param edit 是否可编辑
         * @param result 是否会添加并显示
         * @param file  --- file对象
         * @param fileSize  --- 总文件个数
         * @param currentFileSize  --- 当前文件个数
         */
        beforeFileQueuedCallback: function (edit, result, file, fileSize, currentFileSize) {
        },

        /**
         * 上传失败后执行
         * @param file
         */
        uploadErrorAfter: function (file) {

        },
        /**
         * 上传文件成功时的回调,用于标识为服务端文件
         * @param $item 当前文件item
         * @param data 服务端数据
         */
        uploadSuccessCallback: function ($item, data) {
            if($item && data) {
                //设置当前文件item属性值
                var attrs = data.attrs;
                for(var key in attrs) {
                    $item.attr(key, attrs[key]);
                }
            }
        },

        /**
         * 用于定义其他事件处理
         * @param self
         * @param uploader uploader实例
         */
        definedEvents: function (self, uploader) {
        }
    };

    support = $.extend(support, options.support);

    support.$fns = $fns;  //设置support方法

    webUploaderSupportInstance.supports = support;

    var multiple = support.multiple;

    delete options.support;  //删除额外的support属性

    var $uploader = $(support.uploader),
        $chooseFileBtn = $uploader.find(support.chooseFileBtn),  //选择文件的按钮选择器
        $fileList = $uploader.find(support.fileList),  //显示文件列表的区域
        $uploadFileBtn = $uploader.find(support.uploadFileBtn),  //上传文件的按钮
        $dndWrapper = $uploader.find(support.dndWrapper);  //支持拖拽到此区域

    var $elements = {
        $uploader: $uploader,
        $chooseFileBtn: $chooseFileBtn,
        $fileList: $fileList,
        $uploadFileBtn: $uploadFileBtn,
        $dndWrapper: $dndWrapper
    };

    support.$elements = $elements;

    var defaultOption = {
        accept: {
            title: 'Images',
            extensions: 'gif,jpg,jpeg,bmp,png',
            mimeTypes: 'image/!*'
        },
        pick: {
            id: $chooseFileBtn,
            multiple: multiple
        },
        disableGlobalDnd: true,
        dnd: $dndWrapper,  //支持拖拽到此区域
        resize: false,
        compress: false,  //不压缩图片,原图
        swf: 'Uploader.swf'  // swf文件路径
    };

    var currentOptions = $.extend(true, {}, defaultOption, options);  //当期webuploader的配置, options中的优先级最高

    if(document.all || window.ActiveXObject || "ActiveXObject" in window) {
        if(currentOptions.paste != null) {
            currentOptions.paste = null;
            $fns.log("ie is not support paste");
        }
    }

    webUploaderSupportInstance.support = WebUploader.Uploader.support(); //获取是否支持webuploader上传


    jQuery(function() {
        var $ = jQuery;

        //需要直接设置该区域最小高度,否则会影响第一个实例的选择功能
        $fileList.css({"min-height": support.getFileListMinHeight() + "px"});

        var uploader;
        try {
            if(!webUploaderSupportInstance.support) {
                support.init(support.serverFiles, $fileList);
                $fns.log("WebUploader does not support the browser you are using.");
                return;
            } else {
                uploader = WebUploader.create(currentOptions);  //实例化webuploader
                support.instance = uploader;
                support.init(support.serverFiles, $fileList);
            }

        }  catch (e) {
            $fns.logWarn(e);
        }


        if(uploader) {

            webUploaderSupportInstance.uploader = uploader;

            //实例化后进行调用filePicker对应的元素结构会正常
            uploader.refresh();

            if($uploadFileBtn && $uploadFileBtn[0]) {
                $uploadFileBtn.click(function () {
                    $fns.upload();
                });
            }

            //文件被添加进队列时
            uploader.on('fileQueued', function (file) {
                support.fileQueued && support.fileQueued.apply(support, arguments);
            });

            //移除文件时
            uploader.on('fileDequeued', function (file) {
                support.fileDequeued && support.fileDequeued.apply(support, arguments);
            });

            uploader.on('uploadProgress', function (file, percentage) {
                support.uploadProgress && support.uploadProgress.apply(support, arguments);
            });

            //完成上传时，无论成功或者失败
            uploader.on('uploadComplete', function (file) {
                support.uploadComplete && support.uploadComplete.apply(support, arguments);
            });


            // 文件上传完成后，添加相应的样式(响应成功)
            uploader.on('uploadSuccess', function (file, data) {
                support.uploadSuccess && support.uploadSuccess.apply(support, arguments);
            });

            // 文件上传失败，显示上传出错（上传失败出现错误状态码时）
            uploader.on('uploadError', function (file) {
                support.uploadError && support.uploadError.apply(support, arguments);
            });
            // 当文件被加入队列之前触
            uploader.on('beforeFileQueued', function (file) {
                return support.beforeFileQueued && support.beforeFileQueued.apply(support, arguments);

            });

            //当前uploader实例文件上传完成后触发
            uploader.on("uploadFinished", function () {
                support.uploadFinished && support.uploadFinished.apply(support, arguments);
            });

            uploader.on("uploadBeforeSend", function () {
                support.uploadBeforeSend && support.uploadBeforeSend.apply(support, arguments);

            });

            uploader.on('error', function () {
                support.errorTypeHandler && support.errorTypeHandler.apply(support, arguments);
            });

            //处理当前未定义的事件
            support.definedEvents && support.definedEvents.apply(support, [support, uploader]);
        }
    });


}

//上传该uploader实例的文件
WebUploaderSupport.prototype.upload = function () {
    this.$fns.upload();
}
//判断是否正在上传中
WebUploaderSupport.prototype.isInProgress = function () {
    var flag = false;
    var uploader = this.uploader;
    if(uploader) {
        flag = uploader.isInProgress();
    }
    this.$fns.logInfo();
    return flag;
}


WebUploaderSupport.prototype.retry = function () {
    this.$fns.retry();
}

WebUploaderSupport.prototype.getSupports = function () {
    var supports = this.supports;
    return supports;
}
//更换模式
WebUploaderSupport.prototype.editChange = function (edit) {
    if(typeof edit != "boolean") {
        throw new Error("the param type must be boolean");
    }
    this.getSupports().editChange(edit);
}

//获取当前示例已存在的文件个数
WebUploaderSupport.prototype.getCurrentFileSize = function () {
    return this.getSupports().getCurrentFileSize();
}

//获取最大文件个数
WebUploaderSupport.prototype.getMaxFileSize = function () {
    return this.getSupports().fileSize;
}

//获取剩余文件个数
WebUploaderSupport.prototype.getSurplusFileSize = function () {
    var maxFileSize = this.getMaxFileSize();
    if (maxFileSize < 0) {
        return -1;
    }
    return maxFileSize - this.getSupports().getCurrentFileSize();
}