const router = require("express").Router();
const MemoryModel = require("../models/Memory.model");
const AlbumModel = require("../models/Album.model");
const UserModel = require("../models/User.model");
const isAuth = require("../middlewares/isAuth");
const attachCurrentUser = require("../middlewares/attachCurrentUser");

// CREATE
router.post("/create-memory", isAuth, attachCurrentUser, async (req, res) => {
  try {
    if (!req.body.albuns || req.body.albuns === []) {
      return res.status(400).json({ message: "A memoria precisa de um album" });
    }

    const createdMemory = await MemoryModel.create({
      ...req.body,
      owner: req.currentUser._id,
      $push: { albuns: req.body.albuns },
    });

    return res.status(201).json(createdMemory);
  } catch (err) {
    console.log(err);

    return res.status(500).json(err);
  }
});

// READ ALL
router.get("/my-memories", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const myMemories = await MemoryModel.find(
      { owner: req.currentUser._id },
      { feeling: 0, creationDate: 0, albuns: 0 }
    );

    return res.status(200).json(myMemories);
  } catch (err) {
    console.log(err);

    return res.status(500).json(err);
  }
});

// READ - DETAILS

router.get("/:memoryId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const foundedMemory = await MemoryModel.findOne({
      _id: memoryId,
      owner: req.currentUser._id,
    }).populate("albuns");

    return res.status(200).json(foundedMemory);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

// UPDATE

router.patch("/edit/:memoryId", isAuth, attachCurrentUser, async (req, res) => {
  try {
    const { memoryId } = req.params;
    const { loggedInUser } = req.currentUser;
    const body = { ...req.body };

    delete body.albuns;
    delete body.creationDate;

    const memory = await MemoryModel.findOne({ _id: memoryId });

    if (memory.owner !== loggedInUser._id) {
      return res
        .status(401)
        .json({ message: "Você não pode alterar essa memoria." });
    }

    const updatedMemory = await MemoryModel.findOneAndUpdate(
      { _id: memoryId },
      { ...body },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedMemory);
  } catch (err) {
    console.log(err);

    return res.status(500).json(err);
  }
});

// DELETE

router.delete(
  "/delete/:memoryId",
  isAuth,
  attachCurrentUser,
  async (req, res) => {
    try {
      const { memoryId } = req.params;
      const { loggedInUser } = req.currentUser;

      const memory = MemoryModel.findOne({ _id: memoryId });

      if (loggedInUser._id !== memory.owner) {
        return res
          .status(401)
          .json({ message: "Você não pode alterar essa memoria." });
      }

      const deletedMemory = await MemoryModel.deleteOne({
        _id: req.params.memoryId,
      });

      await AlbumModel.updateMany(
        { memories: memoryId },
        { $pull: { memories: memoryId } }
      );
      await UserModel.updateMany(
        { memories: memoryId },
        { $pull: { memories: memoryId } }
      );

      return res.status(200).json(deletedMemory);
    } catch (err) {
      console.log(err);

      return res.status(500).json(err);
    }
  }
);

router.post(
  "/add-memory/:memoryId/:albumId",
  isAuth,
  attachCurrentUser,
  async (req, res) => {
    try {
      const { memoryId, albumId } = req.params;

      const { loggedInUser } = req.currentUser;

      const memory = MemoryModel.findOne({ _id: memoryId });

      const album = AlbumModel.findOne({ _id: albumId });

      if (
        loggedInUser._id !== memory.owner &&
        loggedInUser._id !== album.owner
      ) {
        return res
          .status(401)
          .json({ message: "Você não pode alterar essa memoria." });
      }

      await AlbumModel.findOneAndUpdate(
        { _id: albumId },
        { $push: { memories: memoryId } },
        { runValidators: true }
      );

      await MemoryModel.findOneAndUpdate(
        { _id: memoryId },
        { $push: { albuns: albumId } },
        { runValidators: true }
      );

      return res
        .status(200)
        .json({ message: "Memoria add ao album com sucesso!" });
    } catch (err) {
      console.log(err);
      return res.status(500).json(err);
    }
  }
);

module.exports = router;
