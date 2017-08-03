"use strict";
/**
 * @param options key：support 自定义拓展属性（可以重写对应的属性,删除文件的逻辑可以重新进行实现）, 其他配置参考webuploader配置,优先级理论大于support的配置
 */
function WebuploaderSupport(options) {
    var that = this;

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
    WebuploaderSupport.fileStatus = fileStatus;

    var $fns = {
        log: function (content) {
            if(support.log && console) {
                console.log(content);
            }
        },
        logInfo: function () {
            var support = that.support;
            if(!support) {
                this.log("WebUploader does not support the browser you are using.");
            } else {
                if(this.getUploader() == null) {
                    this.log("WebUploader has not inited, please use it after inited.");
                }
            }
        },
        getUploader: function () {
            var uploader = that.uploader;
            return uploader;
        },
        getFiles: function () {
            var result = null;
            var uploader = that.uploader;
            if(uploader) {
                result = uploader.getFiles();
            }
            return result;
        },
        getFileSize: function (status) {
            var result = 0;
            var uploader = that.uploader;
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
        retryFile: function (file) {
            var uploader = this.getUploader();
            uploader && uploader.retry(file);
        },
        removeFileWithItem: function (file) {
            var uploader = that.uploader;
            if(file) {
                support.removeFileItem(support.get$Item(file));
                if(uploader) {
                    uploader.removeFile(file.id, true);
                }
            }

        }
    };
    that.$fns = $fns;

    that.support = false;

    if (!WebUploader.Uploader.support()) {  //不支持webuploader上传时
        $fns.log("WebUploader does not support the browser you are using.");
        return;
    }
    that.support = true;


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
        thumbnailWidth: 150,
        thumbnailHeight: 150,
        fileSize: -1,  //文件总个数, -1时无限制
        showPreview: function (uploader, $img, file) {   //显示文件中的预览效果
                var that = this;
                // 优化retina, 在retina下这个值是2
                var ratio = window.devicePixelRatio || 1;
                // 缩略图大小
                var thumbnailWidth = that.thumbnailWidth * ratio, thumbnailHeight = that.thumbnailHeight * ratio;
                uploader.makeThumb(file, function (error, src) {
                if (error) {
                    var $replace = $('<div class="preview"></div>').css({
                        height: thumbnailHeight,
                        width: thumbnailWidth
                    }).append($('<div class="preview-tips">不能预览</div>'));
                    $img.replaceWith($replace);
                    return;
                }
                $img.attr('src', src);
            }, thumbnailWidth, thumbnailHeight);
        },
        get$Item: function (file) {  //获取$item
            return $("#" + file.id);
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
            $fns.retryFile(file);
        },
        fileQueued: function (uploader, file, $fileList, $uploadFileBtn, $chooseFileBtn, removeFileWithItem) {  //文件被添加进队列
            var that = this;
            var $item = $('<div id="' + file.id + '" class="file-item thumbnail">' +
                '<div class="file-info">' + file.name + '</div>' +
                '<img/>' +
                '<div class="file-delete">' + '<button type="button" class="btn btn-info">' + '删除</button></div>' +
                '<div class="file-retry">' + '<button type="button" class="btn btn-info">' + '重试</button></div>' +
                '<div class="state ready">等待上传...</div>' +
                '<div class="progress"><div class="progress-bar"></div></div>' +
                '</div>'
            );
            that.showPreview(uploader, $item.find("img"), file);  //显示预览效果
            $fileList.append($item);  //显示在文件列表中
            that.loadUploadFileBtnStyle();  //加载上传按钮样式
            $item.on("click", '.btn', function () {
                var $this = $(this);
                if($this.parents(".file-retry")[0]) {
                    that.retryFile($item, file);
                } else if ($this.parents(".file-delete")[0]) {
                    that.deleteFile($item, file, that.deleteServerFileCallback, removeFileWithItem);
                }
            });
            that.loadChooseFileBtnStyle($chooseFileBtn, $uploadFileBtn);
        },
        fileDequeued: function (uploader, file, $fileList, $uploadFileBtn) {
            this.loadUploadFileBtnStyle();
        },
        uploadProgress: function (file, percentage) {  //文件上传过程中创建进度条
            var $item = this.get$Item(file);
            $item.removeClass("retry");  //移除重试class
            var $percent = $item.find('.progress .progress-bar');
            $item.find('.file-delete, .preview-tips').addClass("uploading");  //隐藏删除按钮、提示文字
            $item.find('.progress').show();  //显示进度条
            $percent.css('width', percentage * 100 + '%');
        },
        uploadComplete: function (file) {  //完成上传时，无论成功或者失败
            var $item = this.get$Item(file);
            $item.find('.progress').fadeOut();
            $item.find('.file-delete, .preview-tips').removeClass("uploading");  //显示删除按钮、提示文字

            var $uploadFileBtn = this.$elements.$uploadFileBtn;
            var $chooseFileBtn = this.$elements.$chooseFileBtn;


            this.loadChooseFileBtnStyle($chooseFileBtn, $uploadFileBtn);
            this.loadUploadFileBtnStyle();
        },
        uploadSuccess: function (file, data, callback, $chooseFileBtn, $uploadFileBtn) {   // 文件上传完成后
            var $item = this.get$Item(file),
                $state = $item.find('.state');
            $item.find('.progress').hide();
            if (data.status) {  //上传成功时
                if(callback && typeof callback === "function") {
                    callback($item, data);  //用于标识为服务端文件
                }
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
        /***
         *
         * @param uploader
         * @param file
         * @param files
         * @param fileSize  --- 总个数
         * @param removeFileWithItem  --- 用于移除文件及其显示的内容
         * @returns {boolean} 为true时可以添加到webuploader中并进行显示
         */
        beforeFileQueued: function(uploader, file, files, fileSize, removeFileWithItem, $chooseFileBtn, $uploadFileBtn, callback) {
            if(fileSize < 1) {  //无限制个数
                return true;
            }
            var that = this;
            var currentFileSize = that.getCurrentFileSize();  //当前总个数
            var flag = false;
            var edit = that.edit;
            if(edit) {  //可编辑模式时
                if(currentFileSize < fileSize) {
                    flag = true;
                }
            }

            if(callback && typeof callback === "function") {  //执行beforeFileQueuedCallback回调函数
                callback(that, flag, edit, uploader, file, fileSize, currentFileSize);
            }

            return flag;
        },
        /**
         *
         * @param that  --- 当前对象,可以访问其他属性及方法
         * @param result  --- beforeFileQueued返回的结果值
         * @param result  --- 是否可编辑
         * @param uploader  --- 当前uploader实例
         * @param file  --- file对象
         * @param fileSize  --- 总文件个数
         * @param currentFileSize  --- 当前文件个数
         */
        beforeFileQueuedCallback: function (that, result, edit, uploader, file, fileSize, currentFileSize) {},  //回调函数
        uploadError: function (file) {  //文件上传失败后
            var $item = this.get$Item(file),
                $state = $item.find('.state');
            if (!$state.hasClass('error')) {
                $state.attr("class", "state error");
                $state.text('上传失败');
            }
            $item.addClass("retry");
            this.loadUploadFileBtnStyle();
        },
        uploadFinished: function () {},  //文件上传完后触发
        uploadSuccessCallbck: function ($item, data) {  //上传文件成功时的回调,用于标识为服务端文件
            if($item && data) {
                var attrs = data.attrs;
                for(var key in attrs) {
                    $item.attr(key, attrs[key]);
                }
            }

        },
        serverFileAttrName: "data-server-file",  //服务端文件的属性名称
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

        getCurrentFileSize: function () {  //获取当前uploader实例中文件的个数
            var fileStatus = WebuploaderSupport.fileStatus;
            var $fns = this.$fns;
            var initedSize = $fns.getFileSize(fileStatus.inited);  //初始状态个数
            var errorSize = $fns.getFileSize(fileStatus.error);  //上传失败个数
            return initedSize + errorSize + this.getServerFileSize();  //最终加上服务端文件个数
        },
        removeFileItem: function($item) {  //移除$item
            if($item && $item[0]) {
                $item.off().remove();
            }
        },
        deleteFile: function ($item, file, deleteServerFileCallback, removeFileWithItem) {  //删除文件的处理逻辑，包含服务端
            if(this.getIsServerFile($item)) {  //服务端时
                this.deleteServerFile($item, deleteServerFileCallback);
            } else {
                if(removeFileWithItem && file) {
                    removeFileWithItem(file);
                }

                var $chooseFileBtn = this.$elements.$chooseFileBtn, $uploadFileBtn = this.$elements.$uploadFileBtn;
                this.loadChooseFileBtnStyle($chooseFileBtn, $uploadFileBtn);

            }
        },
        deleteServerFileAttrName: "data-delete-url",
        deleteServerFile: function ($item, callback) {
            var that = this;
            var url = $item && $item.attr(that.deleteServerFileAttrName);
            if(url) {
                $.ajax({
                    dataType: "json",
                    type: "post",
                    url: url,
                    success: function (json) {
                        if(callback && typeof callback === "function") {
                            callback(that, $item, json);  //通过callback执行业务操作
                        }
                    }
                });
            }
        },  //当是服务端文件时执行,依赖于getIsServerFile的判断结果
        deleteServerFileCallback: function (that, $item, data) { //deleteServerFile 响应成功时的回调处理, that指当前对象
            if(data.status) {
                that.removeFileItem($item);
            } else {
                alert(data.content);
            }

            var $chooseFileBtn = that.$elements.$chooseFileBtn, $uploadFileBtn = that.$elements.$uploadFileBtn;
            that.loadChooseFileBtnStyle($chooseFileBtn, $uploadFileBtn);
        },
        serverFiles: [],  //加载服务端的数据,当前为 [{name:string, src: string, attrs: {}}]
        init: function (data, $fileList, $chooseFileBtn, $uploadFileBtn) {
            //初始化
            var that = this;
            var edit = that.edit;
            var $files = null;

            //加载服务端数据
            if(data && data.length > 0) {
                for(var i in data) {
                    var item = data[i];
                    var html = '<div class="file-item thumbnail">' +
                        '<div class="file-info">' + item.name + '</div>' +
                        '<img src="'+ item.src+'"/>';

                    if(edit) {
                        html += '<div class="file-delete">' + '<button type="button" class="btn btn-info">' + '删除</button></div>';
                    }
                    html += '<div class="progress"><div class="progress-bar"></div></div>' + '</div>';

                    var $item = $(html);

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
                $files.on('click', '.file-delete .btn', function () {
                    var $item = $(this).parents(".file-item");
                    that.deleteFile($item, null, that.deleteServerFileCallback);
                });
            }
            if(edit) {  //可编辑时
                that.loadChooseFileBtnStyle($chooseFileBtn, $uploadFileBtn);
            } else {  //不可编辑时
                var $actions = $chooseFileBtn.parents(".actions");
                $actions.hide();
                var $label = that.getChooseFileLabel($chooseFileBtn);
                if($label) {
                    $label.hide();
                }
            }
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
        loadChooseFileBtnStyle: function ($chooseFileBtn, $uploadFileBtn) {  //根据文件个数进行展示选择文件的按钮(用于上传完成时,删除文件时，添加到队列时， 初次加载服务端数据时)
            var that = this;
            var $fns = that.$fns;
            var fileSize = that.fileSize;
            if(fileSize > 0) {
                var $actions = $chooseFileBtn.parents(".actions");
                var currentSize = that.getCurrentFileSize();
                var $label = that.getChooseFileLabel($chooseFileBtn);

                if(fileSize === currentSize) {
                    $label && $label.hide();
                    $chooseFileBtn.hide();
                    $uploadFileBtn.addClass("right");
                } else {
                    $label && $label.show();
                    $chooseFileBtn.show();
                    $uploadFileBtn.removeClass("right");
                }
            }
        }
    };

    support = $.extend(support, options.support);

    support.$fns = $fns;  //设置support方法

    that.supports = support;

    var multiple = support.multiple;

    delete options.support;  //删除额外的suporrt属性

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
        currentOptions.paste = null;
        $fns.log("ie is not support paste");
    }

    jQuery(function() {
        var $ = jQuery;

        var uploader = WebUploader.create(currentOptions); //实例化webuploader

        if(uploader) {

            that.uploader = uploader;

            support.init(support.serverFiles, $fileList, $chooseFileBtn, $uploadFileBtn);

            if($uploadFileBtn && $uploadFileBtn[0]) {
                $uploadFileBtn.click(function () {
                    uploader.upload();
                });
            }

            uploader.on('fileQueued', function (file) {  //文件被添加进队列时
                support.fileQueued && support.fileQueued(uploader, file, $fileList, $uploadFileBtn, $chooseFileBtn, $fns.removeFileWithItem);
            });

            uploader.on('fileDequeued', function (file) {  //移除文件时
                support.fileDequeued && support.fileDequeued(uploader, file, $fileList, $uploadFileBtn);
            });

            uploader.on('uploadProgress', function (file, percentage) {
                support.uploadProgress && support.uploadProgress(file, percentage);
            });

            uploader.on('uploadComplete', function (file) {
                support.uploadComplete && support.uploadComplete(file);
            });


            // 文件上传完成后，添加相应的样式
            uploader.on('uploadSuccess', function (file, data) {
                support.uploadSuccess && support.uploadSuccess(file, data, support.uploadSuccessCallbck, $chooseFileBtn, $uploadFileBtn);
            });

            // 文件上传失败，显示上传出错
            uploader.on('uploadError', function (file) {
                support.uploadError && support.uploadError(file);
            });
            // 当文件被加入队列之前触
            uploader.on('beforeFileQueued', function (file) {
                var files = uploader.getFiles();
                return support.beforeFileQueued && support.beforeFileQueued(uploader, file, files, support.fileSize, $fns.removeFileWithItem, $chooseFileBtn, $uploadFileBtn, support.beforeFileQueuedCallback);

            });

            uploader.on("uploadFinished", function () {
                support.uploadFinished && support.uploadFinished();
            });

        }
    });


}

WebuploaderSupport.prototype.upload = function () {
    var uploader = this.uploader;
    if(uploader) {
        uploader.upload();
    }
    this.$fns.logInfo();
}
//判断是否正在上传中
WebuploaderSupport.prototype.isInProgress = function () {
    var flag = false;
    var uploader = this.uploader;
    if(uploader) {
        flag = uploader.isInProgress();
    }
    this.$fns.logInfo();
    return flag;
}


WebuploaderSupport.prototype.retry = function () {
    var uploader = this.uploader;
    if(uploader) {
        uploader.retry();
    }
    this.$fns.logInfo();
}

WebuploaderSupport.prototype.getSupports = function () {
    var supports = this.supports;
    return supports;
}