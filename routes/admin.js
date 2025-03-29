__path = process.cwd();
//―――――――――――――――――――――――――――――――――――――――――― ┏ Modules ┓ ―――――――――――――――――――――――――――――――――――――――――― \\

require("../settings");
const express = require("express");
const router = express.Router();
const passport = require("passport");
require("../controller/passportLocal")(passport);
const dataweb = require("../model/DataWeb");
const User = require("../model/user");
const listApi = require("../model/listapi");
const bcryptjs = require("bcryptjs");
//_______________________ ┏ Function ┓ _______________________\\
function checkRole(role) {
  return function (req, res, next) {
    if (req.isAuthenticated() && req.user.role === role) {
      res.set(
        "Cache-Control",
        "no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0"
      );
      return next(); // Jika pengguna terautentikasi dan memiliki peran yang sesuai, lanjutkan ke rute berikutnya
    }
    res.redirect("/dashboard");
  };
}
async function getApikey(id) {
  let limit = await dataweb.findOne();
  let users = await User.findOne({ _id: id });
  return {
    apikey: users.apikey,
    username: users.username,
    checklimit: users.limitApikey,
    isVerified: users.isVerified,
    RequestToday: limit.RequestToday,
    email: users.email,
  };
}
//_______________________ ┏ Router GET?POST ┓ _______________________\\

router.get("/admin", checkRole("admin"), async (req, res) => {
  let getinfo = await getApikey(req.user.id);
  let { apikey, username, checklimit, isVerified, RequestToday, email, role } = getinfo;
  res.render("admin/admin", {
    username: username,
    verified: isVerified,
    apikey: apikey,
    limit: checklimit,
    RequestToday: RequestToday,
    email: email,
    role: role,
  });
});

//_______________________ ┏ Router CRUD USERDATA ┓ _______________________\\
router.get("/userdata", checkRole("admin"), async (req, res) => {
  let getinfo = await getApikey(req.user.id);
  const datas = await User.find();
  let { username, isVerified, email, role } = getinfo;
  res.render("admin/userlist", {
    username: username,
    verified: isVerified,
    email: email,
    role: role,
    items: datas,
  });
});
/// Menambah Data
router.post("/userdata/tambah", checkRole("admin"),async (req, res) => {
  const { username, password, email, apikey, role, limitApikey } = req.body;
  if (!email || !username || !password || !apikey || !role || !limitApikey) {
      req.flash("error_messages", "Semua Form Harus Diisi !");
      res.redirect('/userdata')
    } else if (username.length < 4) {
      req.flash("error_messages", "Username harus minimal 4 karakter");
      res.redirect('/userdata')
    } else if (username.length > 20) {
      req.flash(
        "error_messages",
        "Limit Username tidak boleh lebih 20 karakter"
      );
      res.redirect('/userdata')
    } else {
      User.findOne(
        { $or: [{ email: email }, { username: username }] },
        function (err, data) {
          if (err) throw err;
          if (data) {
            req.flash("error_messages", "User Sudah Ada, Coba Kembali !");
            res.redirect('/userdata')
          } else {
            bcryptjs.genSalt(12, (err, salt) => {
              if (err) throw err;
              bcryptjs.hash(password, salt, (err, hash) => {
                if (err) throw err;
                User({
                  username: username,
                  email: email,
                  password: hash,
                  apikey: apikey,
                  limitApikey: limitApikey,
                  role: role,
                }).save((err, data) => {
                  if (err) throw err;
                  req.flash("success_messages", "Akun Berhasil Dibuat !");
                  res.redirect('/userdata')
                });
              });
            });
          }
        }
      );
    }
});
// Menghapus data berdasarkan ID
router.get("/userdata/delete/:_id", checkRole("admin"), async (req, res) => {
  const { _id } = req.params;
  try {
    const deletedItem = await User.findByIdAndDelete(_id);
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }
    req.flash("success_messages", "Akun Berhasil Dihapus !");
    res.redirect('/userdata')
  } catch (error) {
    req.flash("error_messages", "Kesalahan Saat Menghapus Data !");
    res.redirect('/userdata')
  }
});
// Mengambil Seluruh Data
router.get('/userdata/all',checkRole("admin"), async (req, res) => {
  try {
      const user = await User.find();
      res.status(200).json(user);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching items', error });
  }
});
// Mengambil data berdasarkan ID
router.get('/userdata/search/:_id',checkRole("admin"), async (req, res) => {
  const { _id } = req.params;
  try {
      const user = await User.findById(_id);
      if (!user) {
          return res.status(404).json({ message: 'Item not found' });
      }
      res.status(200).json(user);
  } catch (error) {
      res.status(500).json({ message: 'Error fetching item', error });
  }
});
// Memperbarui Data Berdasarkan ID
router.post('/userdata/update', checkRole("admin"), async (req, res) => {
  const { _id, username, email, password, apikey, limitApikey, role, isVerified } = req.body;
  try {
  if (!_id) {
        req.flash("error_messages", "ID Tidak ditemukan");
        res.redirect(`/userdata`);
      } else {
        var salt = await bcryptjs.genSalt(12);
        var hash = await bcryptjs.hash(password, salt);
        await User.findOneAndUpdate(
          { _id: _id },
          { $set: { username: username ,
            password : hash,
            email : email,
            apikey : apikey,
            limitApikey : limitApikey,
            role : role
          } }
        );
        req.flash("success_messages", "Data Berhasil Di Update");
        res.redirect("/userdata");
      } 
    } catch (err) {
      res.status(400).json({ message: err.message });
  }   
});
//_______________________ ┏ Router CRUD APIDATA ┓ _______________________\\
// Read All Users (Tampilkan daftar pengguna)
router.get("/apidata", checkRole("admin"), async (req, res) => {
  const api = await listApi.find();
  let getinfo = await getApikey(req.user.id);
  let { apikey, username, checklimit, isVerified, RequestToday, email, role } =
    getinfo;
  res.render("admin/apilist", {
    username: username,
    verified: isVerified,
    apikey: apikey,
    limit: checklimit,
    RequestToday: RequestToday,
    email: email,
    role: role,
    api,
  });
}); // Render tampilan dengan data pengguna


//_______________________ ┏ Router CRUD ┓ _______________________\\

// Create User
router.post("/apidata", checkRole("admin"), async (req, res) => {
  const api = new listApi(req.body);
  try {
    const savedUser = await api.save();
    res.redirect("/apidata"); // Redirect ke daftar pengguna setelah berhasil menambah
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update User
router.post("/apidata/edit", checkRole("admin"), async (req, res) => {
  const {
    _id,
    nama,
    kategori,
    premium,
    url,
    metode,
  } = req.body;
  try {
    if (!_id) {
      req.flash("error_messages", "ID Tidak ditemukan");
      res.redirect(`/apidata`);
    } else {
      await listApi.findOneAndUpdate(
        { _id: _id },
        {
          $set: {
            nama: nama,
            kategori: kategori,
            metode: metode,
            premium: premium,
            url: url,
          },
        }
      );
      req.flash("success_messages", "Data Berhasil Di Update");
      res.redirect("/apidata");
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete User
router.post("/apidata/delete/:id", checkRole("admin"), async (req, res) => {
  try {
    const api = await listApi.findByIdAndDelete(req.params.id);
    if (!api) return res.status(404).json({ message: "Api  not found" });
    res.redirect("/apidata"); // Redirect ke daftar pengguna setelah berhasil menghapus
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mengambil data berdasarkan ID
router.get("/apidata/search/:_id", checkRole("admin"), checkRole("admin"), async (req, res) => {
  const { _id } = req.params;
  try {
    const api = await listApi.findById(_id);
    if (!api) {
      return res.status(404).json({ message: "Data not found" });
    }
    res.status(200).json(api);
  } catch (error) {
    res.status(500).json({ message: "Error fetching item", error });
  }
});
//_______________________ ┏ Perbaikan Oleh Gemini ┓ _______________________\\
router.get("/data", checkRole("admin"), async (req, res) => {
  try {
    const apiData = await listApi.find().lean(); // Gunakan .lean() untuk mendapatkan objek JS biasa
    const userData = await User.find().lean();

    // Tambahkan properti 'type' untuk membedakan jenis data
    const combinedData = [
      ...apiData.map(item => ({ ...item, type: 'api' })),
      ...userData.map(item => ({ ...item, type: 'user' })),
    ];

    let getinfo = await getApikey(req.user.id);
    let { username, isVerified, email, role } = getinfo;

    res.render("admin/data", {
      username: username,
      verified: isVerified,
      email: email,
      role: role,
      data: combinedData,
      messages: {
        success: req.flash("success"),
        error: req.flash("error"),
      },
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    req.flash("error", "Gagal mengambil data.");
    res.redirect("/admin"); // Atau rute lain yang sesuai
  }
});
//_______________________ ┏ END ┓ _______________________\\

module.exports = router;

