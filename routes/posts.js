/**
 * Created by vast on 2017/3/29.
 */
var express = require('express')
var router = require('express').Router()

var CommentModel =require('../models/comment')
var PostModel = require('../models/posts')
var checkLogin = require('../middlewares/check').checkLogin

// GET /posts 所有用户或者特定用户的文章页
//   eg: GET /posts?author=xxx
router.get('/', function (req, res, next) {
    var author=req.query.author
    PostModel.getPosts(author)
        .then(function (posts) {
            res.render('posts',{
                posts:posts
            })
        })
        .catch(next)
})

// POST /posts 发表一篇文章
router.post('/', checkLogin, function (req, res, next) {
    //创建文章
    var author = req.session.user._id
    var title = req.fields.title
    var content = req.fields.content

    // 校验参数
    try {
        if (!title.length) {
            throw new Error("標題不能為空")
        } else if (content == "") {
            throw new Error('内容不能为空')
        }
    } catch (e) {
        req.flash('error', e.message)
        res.redirect('back')
    }


    //写入数据库
    var post = {
        author: author,
        title: title,
        content: content,
        pv: 0,
    }
    PostModel.create(post)
        .then(function (result) {
            // 此 post 是插入 mongodb 后的值，包含 _id
            var post = result.ops[0]
            req.flash('sucess', '恭喜！文章成功发布')
            res.redirect('/posts/${post._id}')
        })
        .catch(next)
})

//GET /posts/create 发表文章页
router.get('/create', checkLogin, function (req, res, next) {
    res.render('create')
})

// GET /posts/:postId 单独一篇的文章页
router.get('/:postId', function(req, res, next) {
    var postId = req.params.postId;

    Promise.all([
        PostModel.getPostById(postId),// 获取文章信息
        CommentModel.getComments(postId),// 获取该文章所有留言
        PostModel.incPv(postId)// pv 加 1
    ])
        .then(function (result) {
            var post = result[0];
            var comments = result[1][0];
            if (!post) {
                throw new Error('该文章不存在');
            }

            res.render('post', {
                post: post,
                comments: comments
            });
        })
        .catch(next);
});

// GET /posts/:postId/edit 更新文章页
router.get('/:postId/edit', checkLogin, function (req, res, next) {
    var postId=req.params.postId
    var author=req.session.user._id

    PostModel.getRawPostById(postId)
        .then(function (post) {
            if(!post){
                throw new Error("该文章不存在")
            }
            if(author.toString()!==post.author._id.toString()){
                throw new Error("权限不足")
            }
            res.render('edit',{post:post})
        })
        .catch(next)
})

// POST /posts/:postId/edit 更新一篇文章
router.post('/:postId/edit', checkLogin, function (req, res, next) {
    var title=req.fields.title
    var content=req.fields.content
    var author=req.session.user._id
    var postId=req.params.postId

    PostModel.updatePostById(postId,author,{title:title,content:content})
        .then(function () {
            req.flash("success",'编辑文章成功')
            res.redirect('/posts/'+postId)
        })
        .catch(next)
})

// GET /posts/:postId/remove 删除一篇文章
router.get('/:postId/remove', checkLogin, function (req, res, next) {
    var postId=req.params.postId
    var author=req.session.user._id

    PostModel.delPostById(postId,author)
        .then(function () {
            req.flash("success","删除成功")
            //调到主页
            res.redirect('/posts')
        })
        .catch(next)
});

// POST /posts/:postId/comment 创建一条留言
router.post('/:postId/comment', checkLogin, function (req, res, next) {
    var author = req.session.user._id;
    var postId = req.params.postId;
    var content = req.fields.content;
    var comment = {
        author: author,
        postId: postId,
        content: content
    };

    CommentModel.create(comment)
        .then(function () {
            req.flash('success', '留言成功');
            // 留言成功后跳转到上一页
            res.redirect('back');
        })
        .catch(next);
});

// GET /posts/:postId/comment/:commentId/remove 删除一条留言
router.get('/:postId/comment/:commentId/remove', checkLogin, function (req, res, next) {
    var commentId = req.params.commentId;
    var author = req.session.user._id;

    CommentModel.delCommentById(commentId, author)
        .then(function () {
            req.flash('success', '删除留言成功');
            // 删除成功后跳转到上一页
            res.redirect('back');
        })
        .catch(next);
});

module.exports = router