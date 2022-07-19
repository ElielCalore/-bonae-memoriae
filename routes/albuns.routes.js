const router = require("express").Router();
const AlbumModel = require("../models/Album.model");
const MemoryModel = require("../models/Memory.model");

const isAuth = require("../middlewares/isAuth");
const attachCurrentUser = require("../middlewares/attachCurrentUser");
const UserModel = require("../models/User.model");

// CREATE

router.post("/create-album", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const createdAlbum = await AlbumModel.create({
      ...req.body,
      owner: req.currentUser._id,
    });

    await UserModel.findOneAndUpdate(
      { _id: req.currentUser._id },
      { $push: { albuns: createdAlbum._id } },
      { new: true }
    );

    return res.status(201).json(createdAlbum);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// READ ALL

router.get("/my-albuns", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const userAlbuns = await AlbumModel.find(
      { owner: req.currentUser._id },
      { memories: 0 }
    );

    return res.status(200).json(userAlbuns);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// READ DETAILS
router.get("/:albumId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const { albumId } = req.params;

    const foundAlbum = await AlbumModel.findOne({
      _id: albumId,
      owner: req.currentUser._id,
    }).populate("memories");

    return res.status(200).json(foundAlbum);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// EDIT

router.patch("/edit/:albumId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const { albumId } = req.params;

    const body = { ...req.body };

    delete body.memories;

    const album = await AlbumModel.findOneAndUpdate(
      { _id: albumId, owner: req.currentUser._id },
      { ...body },
      { new: true, runValidators: true }
    );

    return res.status(200).json(album);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// DELETE

router.delete(
  "/delete/:albumId",
  isAuth,
  attachCurrentUser,
  async (req, res) => {
    try {
      const deletedAlbum = await AlbumModel.deleteOne({
        _id: req.params.albumId,
      });

      await MemoryModel.updateMany(
        { albuns: req.params.albumId },
        { $pull: { albuns: req.params.albumId } }
      );

      await UserModel.updateMany(
        { albuns: req.params.albumId },
        { $pull: { albuns: req.params.albumId } }
      );

      return res.status(200).json(deletedAlbum);
    } catch (err) {
      console.log(err);

      return res.status(500).json(err);
    }
  }
);

module.exports = router;
