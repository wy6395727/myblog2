/**
 * Created by vast on 2017/3/29.
 */
var fs = require('fs')
var path = require('path')
var sha1 = require('sha1')
var express = require('express')
var router = express.Router()

var checkNotLogin = require('../middlewares/check').checkNotlogin
var UserModel = require('../models/user')  //用户模型

// get  /signup 注册页
router.get('/', checkNotLogin, function (req, res, next) {
    res.render('signup')
})

//post
router.post('/', checkNotLogin, function (req, res, next) {
    var name = req.fields.name
    var gender = req.fields.gender
    var bio = req.fields.bio
    var avatar = req.files.avatar.path.split(path.sep).pop()  //req.files文件对象；path.sep 系统的文件路径分隔符
    //console.log(req.files)
    //console.log(req.fields)
    var password = req.fields.password
    var repassword = req.fields.repassword

    //参数校验
    try {
        if (!(name.length >= 1 && name.length <= 10)) {
            throw new Error('名称请限制在1-10个字符')
        }
        if (['m', 'f', 'x'].indexOf(gender) === -1) {
            throw new Error('性别只能是m f x')
        }
        if (!req.files.avatar.name) {
            throw new Error('缺少头像')
        }
        if (password.length < 6) {
            throw  new Error('密码长度少于6个字符')
        }
        if (password !== repassword) {
            throw new Error('两次输入密码不一致')
        }
    } catch (e) {
        //注册失败，异步删除上传头像
        fs.unlink(req.files.avatar.path)
        req.flash('error', e.message)
        return res.redirect('/signup')
    }

    // 明文密码加密
    password = sha1(password)

    // 用户信息
    var user = {
        name: name,
        password: password,
        gender: gender,
        avatar: avatar,
        bio: bio
    }

    // 用户信息写入数据库
    UserModel.create(user)
        .then(function (result) {
            console.log(result)
            //user 是插入mongodb后的值，有_id
            user = result.ops[0]
            // 将用户信息存入 session
            delete user.password
            req.session.user=user
            // 写入 flash
            req.flash('success',"注册成功~\(≧▽≦)/~啦啦啦")
            // 跳转到首页
            res.redirect('/posts')
        })
        .catch(function (e) {
            // 注册失败，异步删除上传的头像
            fs.unlink(req.files.avatar.path)
            // 用户名被占用则跳回注册页，而不是错误页
            if(e.message.match('E11000 duplicate key')){
                req.flash('error','用户名已经存在了傻吊')
                return res.redirect('/signup')
            }
            next(e)
        })
})

module.exports = router