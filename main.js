//서버 기본 설성
const hostname = "0.0.0.0";
const port = "4100"

// FrameWork : Express
const express = require('express');
const cors = require('cors'); // web에서 DB 제어 가능하게
const app = express();
const multer = require('multer'); // file 전송 가능하게
const storage = multer.diskStorage({ // file path와 name 설정
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const sha1 = require('sha1');
const upload = multer({ storage: storage });
const dateutils = require('date-utils');
const fs = require("fs");
var files = upload.fields([{ name: 'userfile', maxCount: 1 }, { name: 'captionfile', maxCount: 1 }]);

app.use(express.json());
app.use(cors());
app.use(express.static('static'));
// mysql 설정
const mysql = require("mysql");
const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "intI2017!@",
    database: "movie"
});
con.connect(function (err) {
    if (err) throw err;
});

app.set('views', __dirname + '/static');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);

app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(fs.readFileSync(__dirname + '/static/index.html'));
});

// 임시
function baseName(str) {
    console.log(str);
    var base = new String(str).substring(str.lastIndexOf('/') + 1); 
    if(base.lastIndexOf(".") != -1)       
        base = base.substring(0, base.lastIndexOf("."));
    return base;
}

app.get('/movie/view/:movie_id', function(req, res) {
    con.query("SELECT * FROM movie where id="+req.params.movie_id, function (err, result, fields) {
        if (err) {
            res.send({ status: "error" });
        }
        else {
            console.log("view");
            res.setHeader('Content-Type', 'text/html');
            res.render("streaming_test", { "video_url_without_extension": "movie/"+baseName(result[0].path)+"/"+baseName(result[0].path), "subtitle_without_extension": "" });
        }
    });

});

//accept READ request on the homepage, 읽기
app.get('/movie', function (req, res) {
    con.query('SELECT COUNT(*) from movie', function (err, result, fields) {
        if (err) {
            res.send({ status: "error" });
        }
        else {
            console.log("테이블의  값 유무 확인");
            result: JSON.stringify(result);
            result = result[0]['COUNT(*)'];
            if (result == 0) {
                res.send({ status: "no data" });
            }
        }
    });
    con.query("SELECT * FROM movie", function (err, result, fields) {
        if (err) {
            res.send({ status: "error" });
        }
        else {
            console.log("read");
            res.send({
                status: "success",
                result: JSON.stringify(result) // JSON화 하여 response
            });
        }
    });

});

// accept POST request on the homepage, 등록
app.post('/movie/create', files, function (req, res, err) {
    var newDate = new Date();
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    var information = JSON.parse(req.body.information); // JSON 형식으로 파싱
    var body = JSON.stringify(req.body);
    var body = JSON.parse(body);
    console.log(body.hasOwnProperty('information'));
    console.log(body);
    if (body.hasOwnProperty('captionfile')) {
        console.log('파일 하나');
        var sql = 'INSERT INTO movie (title, path, showtime, content, upload_time) VALUES (?,?,?,?,?)';
        var title = information.title,
            path = req.files['userfile'][0].path,
            showtime = information.showtime,
            content = information.content,
            title_en = information.title_en,
            director = information.director;
        console.log(information);
        console.log(req.files['userfile']);

        // 일괄적으로 업로드된 영상을 저장
        // 옮길 폴더 생성
        var movie_path = "static/movie/" + title_en;
        fs.mkdir(movie_path, (err) => {
            if (err) throw err;
            console.log("mkdir: " + movie_path);  
        });
        // 영상 옮기기
        fs.rename(path, movie_path+"/"+title_en+".mp4", (err) => {
            if (err) throw err;
            console.log('mv: '+path+" to "+movie_path+"/"+title_en+".mp4");
        });
        path = movie_path+"/"+title_en+".mp4";

        var params = [title, path, showtime, content, time];

        con.query(sql, params, function (err, rows, fields) {
            if (err) console.log(err);
            else console.log(rows);
        });

        // 영상 변환
        const exec = require('child_process').exec;
        exec('./convert_video.sh '+path+' static/sample.m3u8',
            (error, stdout, stderr) => {
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
            }
        });

        if (!err) {
            res.send({ status: "error" });
        }
        else {
            console.log("create");
            res.send({ status: "success" });
        }
    }
    else {
        console.log('파일 둘');
        var sql = 'INSERT INTO movie (title, path, caption_path, showtime, content, upload_time) VALUES (?,?,?,?,?,?)';
        var title = information.title,
            path = req.files['userfile'][0].path,
            caption_path = req.files['captionfile'][0].path,
            showtime = information.showtime,
            content = information.content,
            title_en = information.title_en,
            director = information.director;
        console.log(information);
        console.log(req.files['userfile']);
        console.log(req.files['captionfile']);

        // 일괄적으로 업로드된 영상을 저장
        // 옮길 폴더 생성
        var movie_path = "static/movie/" + title_en;
        fs.mkdir(movie_path, (err) => {
            if (err) throw err;
            console.log("mkdir: " + movie_path);  
        });
        // 영상 옮기기
        fs.rename(path, movie_path+"/"+title_en+".mp4", (err) => {
            if (err) throw err;
            console.log('mv: '+path+" to "+movie_path+"/"+title_en+".mp4");
        });
        path = movie_path+"/"+title_en+".mp4";
        // 자막 옮기기
        fs.rename(caption_path, movie_path+"/"+title_en+".srt", (err) => {
            if (err) throw err;
            console.log('mv: '+caption_path+" to "+movie_path+"/"+title_en+".srt");
        });
        caption_path = movie_path+"/"+title_en+".srt";

        var params = [title, path, caption_path, showtime, content, time];

        con.query(sql, params, function (err, rows, fields) {
            if (err) console.log(err);
            else console.log(rows);
        });

        // 영상 변환
        const exec = require('child_process').exec;
        exec('./convert_video.sh '+path+' static/sample.m3u8',
            (error, stdout, stderr) => {
                console.log(`stdout: ${stdout}`);
                console.log(`stderr: ${stderr}`);
                if (error !== null) {
                    console.log(`exec error: ${error}`);
            }
        });
        if (!err) {
            res.send({ status: "error" });
        }
        else {
            console.log("create");
            res.send({ status: "success" });
        }
    }
});

//accept PUT request at /update, 수정
app.put('/movie/update', files, function (req, res, err) {
    var newDate = new Date();
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    var information = JSON.parse(req.body.information);
    var id = information.id;
    var body = JSON.stringify(req.body);
    var body = JSON.parse(body);
    if (body.hasOwnProperty('captionfile')) {
        console.log(id);
        sql2 = 'select path from movie where id=?';
        con.query(sql2, id, function (err, rows, fields) {
            if (err) console.log(err);
            else {
                rows: JSON.stringify(rows)
                console.log(rows[0].path);
                fs.unlink(rows[0].path, function (err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log("updating...");
                });
            }
        });

        var sql = 'UPDATE movie SET title=?, path=?, showtime=?, content=?, upload_time=? WHERE id=?';
        var title = information.title,
            path = req.files['userfile'][0].path,
            showtime = information.showtime,
            content = information.content;

        var params = [title, path, showtime, content, time, id];
        con.query(sql, params, function (err, rows, fields) {
            if (err) console.log(err);
            else console.log(rows);
        });
        if (!err) {
            res.send({ status: "error" });
        }
        else {
            res.send({ status: "success" });
        }

    }
    else {
        console.log(id);
        sql2 = 'select path from movie where id=?';
        sql3 = 'select caption_path from movie where id=?';
        con.query(sql2, id, function (err, rows, fields) {
            if (err) console.log(err);
            else {
                rows: JSON.stringify(rows)
                console.log(rows[0].path);
                fs.unlink(rows[0].path, function (err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log("updating...");
                });
            }
        });
        con.query(sql3, id, function (err, rows, fields) {
            if (err) console.log(err);
            else {
                rows: JSON.stringify(rows)
                console.log(rows[0].caption_path);
                fs.unlink(rows[0].caption_path, function (err) {
                    if (err) {
                        return console.error(err);
                    }
                    console.log("updating...");
                });
            }
        });
        var sql = 'UPDATE movie SET title=?, path=?, caption_path=?, showtime=?, content=?, upload_time=? WHERE id=?';
        var title = information.title,
            path = req.files['userfile'][0].path,
            caption_path = req.files['captionfile'][0].path,
            showtime = information.showtime,
            content = information.content;

        var params = [title, path, caption_path, showtime, content, time, id];
        con.query(sql, params, function (err, rows, fields) {
            if (err) console.log(err);
            else console.log(rows);
        });
        if (!err) {
            res.send({ status: "error" });
        }
        else {
            res.send({ status: "success" });
        }

    }
    console.log(id);
    sql2 = 'select path from movie where id=?';
    sql3 = 'select caption_path from movie where id=?';
    con.query(sql2, id, function (err, rows, fields) {
        if (err) console.log(err);
        else {
            rows: JSON.stringify(rows)
            console.log(rows[0].path);
            fs.unlink(rows[0].path, function (err) {
                if (err) {
                    return console.error(err);
                }
                console.log("updating...");
            });
        }
    });
    con.query(sql3, id, function (err, rows, fields) {
        if (err) console.log(err);
        else {
            rows: JSON.stringify(rows)
            console.log(rows[0].caption_path);
            fs.unlink(rows[0].caption_path, function (err) {
                if (err) {
                    return console.error(err);
                }
                console.log("updating...");
            });
        }
    });
    var sql = 'UPDATE movie SET title=?, path=?, caption_path=?, showtime=?, content=?, upload_time=? WHERE id=?';
    var title = information.title,
        path = req.files['userfile'][0].path,
        caption_path = req.files['captionfile'][0].path,
        showtime = information.showtime,
        content = information.content;

    var params = [title, path, caption_path, showtime, content, time, id];
    con.query(sql, params, function (err, rows, fields) {
        if (err) console.log(err);
        else console.log(rows);
    });
    if (!err) {
        res.send({ status: "error" });
    }
    else {
        res.send({ status: "success" });
    }
});

//accept DELETE request at /delete, 삭제
app.delete('/movie/delete/:id', function (req, res, err) {
    var id = req.params.id;//파라미터로 넘어온 id 사용
    var sql2 = 'select path from movie where id=?';
    con.query(sql2, id, function (err, result, fields) {
        fs.unlink(result[0].path);
    });
    var sql = 'DELETE FROM movie WHERE id=?';
    var params = [req.params.id];
    con.query(sql, params, function (err, rows, fields) {
        if (err) console.log(err);
        else console.log(rows);
    });
    if (!err) {
        res.send({ status: "error" });
    }
    else {
        res.send({ status: "success" });
    }
});

//accept UPLOAD request at /upload, 업로드
app.post('/upload', upload.single('userfile'), function (req, res, next) {
    console.log(req.file.filename);
    res.send('업로드 성공 ' + req.file.filename);
    console.log("upload");
});

//login
app.post('/user/login', function (req, res, err) {
    var inputtoken;
    var id = req.body.id,
        password = req.body.password;
    var sql = 'select token from user where id=?';
    console.log("login");
    con.query(sql, id, function (err, result, fields) {
        if (result[0].token == sha1(id + password)) {
            res.send({
                status: "success",
                token: result[0].token
            });
        }
        else {
            res.send({ status: "fail" });
        }
    });
});

//join
app.post('/user/join', function (req, res, err) {
    console.log(req.body);
    var id = req.body.id,
        name = req.body.name,
        password = req.body.password,
        inputtoken = sha1(id + password);
    var sql = 'insert into user values (?,?,?,?)';
    var params = [id, name, password, inputtoken];
    con.query(sql, params, function (err, result, fields) { });
    console.log("join");
    if (!err) res.send({ status: "error" });
    else res.send({ status: "success" });
});

const server = app.listen(port, hostname, () => {
    console.log('Server running at http:' + hostname + port);
});
