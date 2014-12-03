
var PHPCI = {
    intervals: {},

    init: function () {
        $(document).ready(function () {
            // Update latest builds every 5 seconds:
            PHPCI.getBuilds();
            PHPCI.intervals.getBuilds = setInterval(PHPCI.getBuilds, 5000);

            // Update latest project builds every 10 seconds:
            if (typeof PHPCI_PROJECT_ID != 'undefined') {
                PHPCI.intervals.getProjectBuilds = setInterval(PHPCI.getProjectBuilds, 10000);
            }
        });

        $(window).on('builds-updated', function (e, data) {
            PHPCI.updateHeaderBuilds(data);
        });
    },

    getBuilds: function () {
        $.ajax({
            url: PHPCI_URL + 'build/latest',

            success: function (data) {
                $(window).trigger('builds-updated', [JSON.parse(data)]);
            },

            error: PHPCI.handleFailedAjax
        });
    },

    getProjectBuilds: function () {
        $.ajax({
            url: PHPCI_URL + 'project/builds/' + PHPCI_PROJECT_ID + '?branch=' + PHPCI_PROJECT_BRANCH,

            success: function (data) {
                $('#latest-builds').html(data);
            },

            error: PHPCI.handleFailedAjax
        });
    },

    updateHeaderBuilds: function (data) {
        $('.phpci-pending-list').empty();
        $('.phpci-running-list').empty();

        if (!data.pending.count) {
            $('.phpci-pending').hide();
        } else {
            $('.phpci-pending').show();
            $('.phpci-pending-count').text(data.pending.count);

            $.each(data.pending.items, function (idx, build) {
                $('.phpci-pending-list').append(build.header_row);
            });
        }

        if (!data.running.count) {
            $('.phpci-running').hide();
        } else {
            $('.phpci-running').show();
            $('.phpci-running-count').text(data.running.count);

            $.each(data.running.items, function (idx, build) {
                $('.phpci-running-list').append(build.header_row);
            });
        }

    }
};

PHPCI.init();

function handleFailedAjax(xhr)
{
    if (xhr.status == 401) {
        window.location.href = window.PHPCI_URL + 'session/login';
    }
}

/**
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
 * for the details of code below
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (oThis) {
        if (typeof this !== "function") {
            // closest thing possible to the ECMAScript 5 internal IsCallable function
            throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
            fToBind = this,
            fNOP = function () {
            },
            fBound = function () {
                return fToBind.apply(this instanceof fNOP && oThis
                    ? this
                    : oThis,
                    aArgs.concat(Array.prototype.slice.call(arguments)));
            };

        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
    };
}

/**
 * Used for delete buttons in the system, just to prevent accidental clicks.
 */
function confirmDelete(url, subject, reloadAfter) {

    var dialog = new PHPCIConfirmDialog({
        message: subject + ' will be permanently deleted. Are you sure?',
        confirmBtnCaption: 'Delete',
        /*
         confirm-btn click handler
         */
        confirmed: function (e) {
            var dialog = this;
            e.preventDefault();

            /*
             Call delete URL
             */
            $.ajax({
                url: url,
                success: function (data) {
                    if (reloadAfter) {
                        dialog.onClose = function () {
                            window.location.reload();
                        };
                    }

                    dialog.showStatusMessage('Successfully deleted!', 1000);
                },
                error: function (data) {
                    dialog.showStatusMessage('Deletion failed! Server says "' + data.statusText + '"');

                    if (data.status == 401) {
                        handleFailedAjax(data);
                    }
                }
            });
        }
    });

    dialog.show();
    return dialog;
}

/**
 * PHPCIConfirmDialog constructor options object
 * @type {{message: string, title: string, confirmBtnCaption: string, cancelBtnCaption: string, confirmed: Function}}
 */
var PHPCIConfirmDialogOptions = {
    message: 'The action will be performed and cannot be undone. Are you sure?',
    title: 'Confirmation Dialog',
    confirmBtnCaption: 'Ok',
    cancelBtnCaption: 'Cancel',
    confirmed: function (e) {
        this.close();
    }
};

var PHPCIConfirmDialog = Class.extend({
    /**
     * @private
     * @var {bool} Determines whether the dialog has been confirmed
     */
    confirmed: false,

    /**
     * @param {PHPCIConfirmDialogOptions} options
     */
    init: function (options) {

        options = options ? $.extend(PHPCIConfirmDialogOptions, options) : PHPCIConfirmDialogOptions;

        if (!$('#confirm-dialog').length) {
            /*
             Add the dialog html to a page on first use. No need to have it there before first use.
             */
            $('body').append(
                '<div class="modal fade" id="confirm-dialog">'
                    + '<div class="modal-dialog">'
                    + '<div class="modal-content">'
                    + '<div class="modal-header">'
                    + '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>'
                    + '<h4 class="modal-title"></h4>'
                    + '</div>'
                    + '<div class="modal-body">'
                    + '<p></p>'
                    + '</div>'
                    + '<div class="modal-footer">'
                    + '<button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>'
                    + '<button type="button" class="btn btn-primary"></button>'
                    + '</div>'
                    + '</div>'
                    + '</div>'
                    + '</div>'
            );
        }

        /*
         Define dialog controls
         */
        this.$dialog = $('#confirm-dialog');
        this.$cancelBtn = this.$dialog.find('div.modal-footer button.btn-default');
        this.$confirmBtn = this.$dialog.find('div.modal-footer button.btn-primary');
        this.$title = this.$dialog.find('h4.modal-title');
        this.$body = this.$dialog.find('div.modal-body');

        /*
         Initialize its values
         */
        this.$title.html(options.title ? options.title : PHPCIConfirmDialogOptions.title);
        this.$body.html(options.message ? options.message : PHPCIConfirmDialogOptions.message);
        this.$confirmBtn.html(
            options.confirmBtnCaption ? options.confirmBtnCaption : PHPCIConfirmDialogOptions.confirmBtnCaption
        );

        this.$cancelBtn.html(
            options.cancelBtnCaption ? options.cancelBtnCaption : PHPCIConfirmDialogOptions.cancelBtnCaption
        );

        /*
         Events
         */
        this.confirmBtnClick = options.confirmed;

        /*
         Re-bind handlers
         */
        this.$confirmBtn.unbind('click');
        this.$confirmBtn.click(this.onConfirm.bind(this));

        this.$confirmBtn.unbind('hidden.bs.modal');

        /*
         Bind the close event of the dialog to the set of onClose* methods
         */
        this.$dialog.on('hidden.bs.modal', function () {this.onClose()}.bind(this));
        this.$dialog.on('hidden.bs.modal', function () {
            if (this.confirmed) {
                this.onCloseConfirmed();
            } else {
                this.onCloseCanceled();
            }
        }.bind(this));

        /*
         Restore state if was changed previously
         */
        this.$cancelBtn.show();
        this.$confirmBtn.show();
        this.confirmed = false;
    },

    /**
     * Show dialog
     */
    show: function () {
        this.$dialog.modal('show');
    },

    /**
     * Hide dialog
     */
    close: function () {
        this.$dialog.modal('hide');
    },

    onConfirm: function (e) {
        this.confirmed = true;
        $(this).attr('disabled', 'disabled');
        this.confirmBtnClick(e);
    },

    /**
     * Called only when confirmed dialog was closed
     */
    onCloseConfirmed: function () {},

    /**
     * Called only when canceled dialog was closed
     */
    onCloseCanceled: function () {},

    /**
     * Called always when the dialog was closed
     */
    onClose: function () {},

    showStatusMessage: function (message, closeTimeout) {
        this.$confirmBtn.hide();
        this.$cancelBtn.html('Close');

        /*
         Status message
         */
        this.$body.html(message);

        if (closeTimeout) {
            window.setTimeout(function () {
                /*
                 Hide the dialog
                 */
                this.close();
            }.bind(this), closeTimeout);
        }
    }
});

/**
 * Used to initialise the project form:
 */
function setupProjectForm()
{
    $('.github-container').hide();

    $('#element-reference').change(function()
    {
        var el  = $(this);
        var val = el.val();
        var type = $('#element-type').val();
        var acceptable = {
            'github': {
                'ssh': /git\@github\.com\:([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)\.git/,
                'git': /git\:\/\/github.com\/([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)\.git/,
                'http': /https\:\/\/github\.com\/([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)(\.git)?/
            },
            'bitbucket': {
                'ssh': /git\@bitbucket\.org\:([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)\.git/,
                'http': /https\:\/\/[a-zA-Z0-9_\-]+\@bitbucket.org\/([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)\.git/,
                'anon': /https\:\/\/bitbucket.org\/([a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-]+)(\.git)?/
            }

        };

        if( acceptable[type] !== undefined ) {
            for(var i in acceptable[type]) {
                if(val.match(acceptable[type][i])) {
                    el.val(val.replace(acceptable[type][i], '$1'));
                }
            }
        }
    });

    $('#element-type').change(function() {
        if ($(this).val() == 'github') {
            $('#loading').show();

            $.ajax({
                dataType: "json",
                url: window.PHPCI_URL + 'project/github-repositories',
                success: function (data) {
                    $('#loading').hide();

                    if (data && data.repos) {
                        $('#element-github').empty();

                        for (var i in data.repos) {
                            var name = data.repos[i];
                            $('#element-github').append($('<option></option>').text(name).val(name));
                        }

                        $('.github-container').slideDown();
                    }
                },
                error: handleFailedAjax
            });
        } else {
            $('.github-container').slideUp();
        }
        $('#element-reference').trigger('change');
    });

    $('#element-github').change(function()
    {
        var val = $('#element-github').val();

        if(val != 'choose') {
            $('#element-type').val('github');
            $('#element-reference').val(val);

            $('label[for=element-reference]').hide();
            $('label[for=element-type]').hide();
            $('#element-reference').hide();
            $('#element-type').hide();
            $('#element-token').val(window.github_token);
            $('#element-title').val(val);
        }
        else {
            $('label[for=element-reference]').show();
            $('label[for=element-type]').show();
            $('#element-reference').show();
            $('#element-type').show();
            $('#element-reference').val('');
            $('#element-token').val('');
        }
    });
}

var dateFormat = function () {
    var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g,
        timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g,
        timezoneClip = /[^-+\dA-Z]/g,
        pad = function (val, len) {
            val = String(val);
            len = len || 2;
            while (val.length < len) val = "0" + val;
            return val;
        };

    // Regexes and supporting functions are cached through closure
    return function (date, mask, utc) {
        var dF = dateFormat;

        // You can't provide utc if you skip other args (use the "UTC:" mask prefix)
        if (arguments.length == 1 && Object.prototype.toString.call(date) == "[object String]" && !/\d/.test(date)) {
            mask = date;
            date = undefined;
        }

        // Passing date through Date applies Date.parse, if necessary
        date = date ? new Date(date) : new Date;
        if (isNaN(date)) throw SyntaxError("invalid date");

        mask = String(dF.masks[mask] || mask || dF.masks["default"]);

        // Allow setting the utc argument via the mask
        if (mask.slice(0, 4) == "UTC:") {
            mask = mask.slice(4);
            utc = true;
        }

        var _ = utc ? "getUTC" : "get",
            d = date[_ + "Date"](),
            D = date[_ + "Day"](),
            m = date[_ + "Month"](),
            y = date[_ + "FullYear"](),
            H = date[_ + "Hours"](),
            M = date[_ + "Minutes"](),
            s = date[_ + "Seconds"](),
            L = date[_ + "Milliseconds"](),
            o = utc ? 0 : date.getTimezoneOffset(),
            flags = {
                d:    d,
                dd:   pad(d),
                ddd:  dF.i18n.dayNames[D],
                dddd: dF.i18n.dayNames[D + 7],
                m:    m + 1,
                mm:   pad(m + 1),
                mmm:  dF.i18n.monthNames[m],
                mmmm: dF.i18n.monthNames[m + 12],
                yy:   String(y).slice(2),
                yyyy: y,
                h:    H % 12 || 12,
                hh:   pad(H % 12 || 12),
                H:    H,
                HH:   pad(H),
                M:    M,
                MM:   pad(M),
                s:    s,
                ss:   pad(s),
                l:    pad(L, 3),
                L:    pad(L > 99 ? Math.round(L / 10) : L),
                t:    H < 12 ? "a"  : "p",
                tt:   H < 12 ? "am" : "pm",
                T:    H < 12 ? "A"  : "P",
                TT:   H < 12 ? "AM" : "PM",
                Z:    utc ? "UTC" : (String(date).match(timezone) || [""]).pop().replace(timezoneClip, ""),
                o:    (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
                S:    ["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
            };

        return mask.replace(token, function ($0) {
            return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
        });
    };
}();

// Some common format strings
dateFormat.masks = {
    "default":      "ddd mmm dd yyyy HH:MM:ss",
    shortDate:      "m/d/yy",
    mediumDate:     "mmm d, yyyy",
    longDate:       "mmmm d, yyyy",
    fullDate:       "dddd, mmmm d, yyyy",
    shortTime:      "h:MM TT",
    mediumTime:     "h:MM:ss TT",
    longTime:       "h:MM:ss TT Z",
    isoDate:        "yyyy-mm-dd",
    isoTime:        "HH:MM:ss",
    isoDateTime:    "yyyy-mm-dd'T'HH:MM:ss",
    isoUtcDateTime: "UTC:yyyy-mm-dd'T'HH:MM:ss'Z'"
};

// Internationalization strings
dateFormat.i18n = {
    dayNames: [
        "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
        "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
    ],
    monthNames: [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
        "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ]
};

// For convenience...
Date.prototype.format = function (mask, utc) {
    return dateFormat(this, mask, utc);
};